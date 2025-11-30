-- server.lua
local framework = Config.Framework or ''
local QBCore = exports[framework]:GetCoreObject()
local MySQL = exports.oxmysql
local Config = Config or {}
local questions = Config.Questions or {}

local function safeTableName(name)
    return name:gsub("[^%w_]", "")   -- allow only a–z, 0–9, _
end

local tableName = safeTableName(Config.DB.ApplicationsTable or "police_applications")

AddEventHandler('onResourceStart', function(resName)
    if resName ~= GetCurrentResourceName() then return end

    local sql = string.format([[
        CREATE TABLE IF NOT EXISTS `%s` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            citizenid   VARCHAR(50)  NOT NULL,
            player_name VARCHAR(120) NOT NULL,
            discord     VARCHAR(120) DEFAULT NULL,
            dob         VARCHAR(40)  DEFAULT NULL,
            origin  VARCHAR(100) DEFAULT NULL,
            answers_json LONGTEXT    NOT NULL,
            status         VARCHAR(40)  NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]], tableName)

    exports.oxmysql:execute(sql, {}, function(affected)
        print("[sg-pd_application] Ensured table `" .. tableName .. "`")
    end)
end)


-- Discord Webhook Notification
local function SendDiscordApplication(src, citizenid, answers, appId)
    -- Webhook required
    if not Config.DiscordWebhook or Config.DiscordWebhook == "" then
        return
    end

    -- Get player safely
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player or not Player.PlayerData then
        print("[sg-pd_application] SendDiscordApplication: Player not found for src " .. tostring(src))
        return
    end

    local charinfo = Player.PlayerData.charinfo or {}

    local playerName = (charinfo.firstname or "Unknown") .. " " .. (charinfo.lastname or "")
    local dob        = charinfo.birthdate or "Unknown"
    local origin     = charinfo.nationality or "Unknown"
    local discord    = Player.PlayerData.name

    --  Build fields from Config.Questions + answers
    local fields = {}

    local function addSection(title, list)
        if not list or #list == 0 then return end
        local lines = {}

        for _, q in ipairs(list) do
            local id = tostring(q.id)
            local questionText = q.question or q.label or ("Question " .. id)
            local ans = answers[id] or "N/A"

            ans = tostring(ans)

            -- trim a bit so we don't explode Discord limits
            if #ans > 900 then
                ans = ans:sub(1, 900) .. "..."
            end

            table.insert(lines, ("**%s**\n%s"):format(questionText, ans))
        end

        if #lines > 0 then
            table.insert(fields, {
                name  = title,
                value = table.concat(lines, "\n\n"),
                inline = false
            })
        end
    end

    addSection("Personal Info",       Config.Questions.Step1 or {})
    addSection("Police Knowledge",    Config.Questions.PoliceQuestions or {})
    addSection("Scenario Assessment", Config.Questions.Scenarios or {})

    local answersHeading = "__**Answers**__"

    -- Build embed
    local embed = {
        title = "New Police Department Application",
        description = string.format(
            "**Name -> ** %s\n**CitizenID -> ** %s\n**Discord -> ** %s\n**Origin -> ** %s\n**Date of Birth -> ** %s\n\n%s",
            playerName ~= "" and playerName or "Unknown",
            citizenid or "Unknown",
            discord,
            origin,
            dob,
            answersHeading
        ),
        color = 3447003, -- blue sidebar
        footer = {
        text = ("Application ID: %d | Submitted on %s"):format(
                appId or 0,
                os.date("%Y-%m-%d %H:%M")
        )
        }
    }

    -- Optional header image, only if we have a non-empty string URL
    if type(Config.DiscordHeaderImage) == "string" and Config.DiscordHeaderImage ~= "" then
        embed.image = { url = Config.DiscordHeaderImage }
    end

    -- Only attach fields if there is at least one
    if #fields > 0 then
        embed.fields = fields
    end

    local payload = {
        embeds = { embed }
    }

    if Config.DiscordPingRole and Config.DiscordPingRole ~= "" then
        payload.content = Config.DiscordPingRole
    end

    PerformHttpRequest(
        Config.DiscordWebhook,
        function(status, text)
            if status ~= 200 and status ~= 204 then
                print(("[sg-pd_application] Discord webhook failed: HTTP %s, body: %s"):format(
                    tostring(status),
                    tostring(text)
                ))
            end
        end,
        "POST",
        json.encode(payload),
        { ["Content-Type"] = "application/json" }
    )
end


------------------------------
--Check if player has Applied already
function DoesPlayerHaveApplication(citizenid)
    if not citizenid or type(citizenid) ~= "string" then
        print("[sg-pd_application] Invalid citizenid provided")
        return false
    end

    local tableName = safeTableName(Config.DB.ApplicationsTable or "police_applications")

    local result = exports.oxmysql:scalarSync(
        ('SELECT 1 FROM `%s` WHERE citizenid = ? LIMIT 1'):format(tableName),
        { citizenid }
    )

    return result ~= nil
end

QBCore.Functions.CreateCallback('lspd:submitApplication', function(source, cb, data)
    if not data then
        cb({ error = 'Missing data' })
        return
    end
    
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then
        cb({ error = 'Player not found' })
        return
    end

    -- Player informations
    local citizenid = Player.PlayerData.citizenid
    local playerName = data.answers.fullname or (Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname)
    local discord = Player.PlayerData.charinfo.discord or "Δεν εχει φτιαχτει ακομα"
    local dob = data.answers.dob or Player.PlayerData.charinfo.birthdate or "Unknown"
    local origin = data.answers.origin
    local hasApplication = DoesPlayerHaveApplication(Player.PlayerData.citizenid)

    if hasApplication then
        cb({ error = "You Have applied for LSPD already!" })
        return
    end

    -- Answers
    local answers = data.answers or {}

    if (type(answers) ~= "table") then
        cb({ error = "Invalid answers format" })
        return
    end

    -- Validation: load questions & verify answers

    if not Config.Questions then
        cb({ error = "No active questions found in the Config File." })
        return
    end

    local answerObject = {}

    -- Validate Step 1
    for _, q in ipairs(questions.Step1) do
        local qid = tostring(q.id)
        local ans = tostring(data.answers[qid] or ""):gsub("^%s*(.-)%s*$", "%1")
        if ans == "" then
            cb({ error = 'Missing answer for required question: "' .. q.label .. '"' })
            return
        end
        answerObject[qid] = ans
    end

    -- Validate Police Questions
    for _, q in ipairs(questions.PoliceQuestions) do
        local qid = tostring(q.id)
        local ans = tostring(data.answers[qid] or ""):gsub("^%s*(.-)%s*$", "%1")
        local wc = #(ans:gsub("%S+", "\0"))

        if ans == "" then
            cb({ error = 'Missing answer for required question: "' .. q.label .. '"' })
            return
        end
        if ans ~= "" then
            if wc < q.word_min or wc > q.word_max then
                cb({ error = 'Question "' .. q.label .. '" must be between ' .. q.word_min .. ' and ' .. q.word_max .. ' words.' })
                return
            end
        end
        answerObject[qid] = ans
    end
    -- Validate Scenario Questions
    for _, q in ipairs(questions.Scenarios) do
        local qid = tostring(q.id)
        local ans = tostring(data.answers[qid] or ""):gsub("^%s*(.-)%s*$", "%1")
        local wc = #(ans:gsub("%S+", "\0"))

        if ans == "" then
            cb({ error = 'Missing answer for required question: "' .. q.label .. '"' })
            return
        end
        if ans ~= "" then
            if wc < q.word_min or wc > q.word_max then
                cb({ error = 'Question "' .. q.label .. '" must be between ' .. q.word_min .. ' and ' .. q.word_max .. ' words.' })
                return
            end
        end
        answerObject[qid] = ans
    end

        
    -- Debug: print the JSON we are about to save
    local encodedAnswers = json.encode(answerObject)
    -- Print data
    print("printing after filling answerObject")
    for questionId, answer in pairs(answerObject) do
        print(string.format("   • %s → %s", questionId, tostring(answer)))

        -- Optional: validate required fields
        if answer == "" then
            print("^1   [WARNING] Empty answer for: " .. questionId .. "^7")
        end
    end    
    --print(('[sg-pd_application] Answers for %s: %s'):format(citizenid, encodedAnswers))

    local insertSql = string.format([[
        INSERT INTO `%s` (citizenid, player_name, discord, dob, origin, answers_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ]], tableName
    )
    -- Insert into DB
    exports.oxmysql:insert(insertSql,
        {
            citizenid,
            playerName,
            discord,
            dob,
            origin,
            json.encode(answerObject),
            'pending'
        },
        function(insertId)
            if insertId then
                SendDiscordApplication(source, citizenid, answerObject, insertId)
                cb({ success = true, message = "Application submitted successfully!" })
            else
                cb({ error = "Failed to store application." })
            end
        end
    )
end)

