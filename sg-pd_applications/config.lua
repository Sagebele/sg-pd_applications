Config = Config or {}


-- auto = detect qb-core / es_extended, otherwise standalone
Config.Framework = 'qb-core'

-- Choose your DB library:
Config.Database = 'oxmysql'   -- 'oxmysql' / 'mysql-async' / 'ghmattimysql'


-- Optional, for the NUI (you can still keep these in JS if you prefer)
Config.ApplicationTitle = "Los Santos Police Department"
Config.Subtitle = "Application Form"

Config.Locations = {
    coords = vector3(440.80, -980.16, 30.7),
    label = "Police Application",
    radius = 8.5
}

-- DB table names
Config.DB = {
    ApplicationsTable = "police_applications"
}

Config.DiscordWebhook = ""      -- put your webhook URL here
Config.DiscordPingRole = ""     -- optional: "<@&ROLE_ID>" to ping a role on each app
-- full-width header image (https:// link only)!!!!
Config.DiscordHeaderImage = "https://i.imgur.com/A2W47BO.png"  

-- Application Questions

Config.Questions = {
    Step1 = {
        { id = "fullname", label = "Full Name *", type = "text", placeholder = "John Doe" },
        { id = "dob", label = "Date of Birth *", type = "date" },
        { id = "origin", label = "Where are you from? *", type = "text", placeholder = "Los Santos, USA" },
        { 
            id = "self_description", 
            label = "Describe yourself *", 
            type = "textarea", 
            placeholder = "Tell us about yourself...",
            word_min = 10,
            word_max = 40
        },
    },
    PoliceQuestions = {
        { 
            id = "role", 
            label = "Write the most important one!... *",
            type = "textarea",
            question = "What is the main role of a police officer? *", 
            word_min = 10, 
            word_max = 100 
        },
        { 
            id = "force", 
            label = "Answer here shortly... *",
            type = "textarea",
            question = "What is the fourth use of force?", 
            word_min = 15, 
            word_max = 80 
        },
        {
            id = "experience",
            label = "Previous police experience",
            type = "textarea",
            question = "What previous police experience do you have?*",
            word_min = 10,
            word_max = 50
        },
        {
            id = "stress",
            label = "handle stressful situations*",
            type = "textarea",
            question = "How do you handle stressful situations while on duty? Describe a situation where you handled a stressfull situation.",
            word_min = 10,
            word_max = 50
        }
    },
    Scenarios = {
        { 
            id = "robbery",
            label = "Write two or three sentences! *",
            type = "scenario",
            question = "You arrive at a store robbery, what is your first action?",
            image = "images/scenario1.png",
            word_min = 10,
            word_max = 50 
        },
        { 
            id = "officer_misconduct",
            label = "What would you do? *",
            type = "scenario",
            question = "You witness another officer breaking traffic laws without valid reason. What do you do?",
            word_min = 10,
            word_max = 50 
        }

    }
}