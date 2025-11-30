-- client.lua
QBCore = exports['qb-core']:GetCoreObject()
Config = Config or {}


local APPLICATION_COORDS = Config.Locations.coords or vector3(441.0, -978.9, 30.7) -- Example: Mission Row PD - Change as needed
local APPLICATION_RADIUS = Config.Locations.radius or 8.5

local nuiOpen = false




function OpenApplication()
    if nuiOpen then return end

    SetNuiFocus(true, true)
    SendNUIMessage({ action = "open", config = Config })
    nuiOpen = true

    -- Optional: Play sound
    PlaySoundFrontend(-1, "SELECT", "HUD_FRONTEND_DEFAULT_SOUNDSET", false)

end

function CloseApplication()
    if not nuiOpen then return end

    SetNuiFocus(false, false)
    SendNUIMessage({ action = "close" })
    nuiOpen = false
end

Citizen.CreateThread(function()
    while true do
        Citizen.Wait(10)
            if GetResourceState('qb-target') == 'started' then
            exports['qb-target']:AddBoxZone("lspd_app_pc", APPLICATION_COORDS, 1.0, 1.0, {
                name = "lspd_app_pc",
                heading = 90.0,
                debugPoly = false,
                minZ = 30.0,
                maxZ = 32.0,
            }, {
                options = {
                    {
                        icon = "fas fa-clipboard",
                        label = "Open LSPD Application",
                        action = function(entity)
                            OpenApplication()
                        end,
                    },
                },
                distance = APPLICATION_RADIUS
            })
            elseif GetResourceState('qtarget') == 'started' then
                exports['qtarget']:AddBoxZone("lspd_app_pc", APPLICATION_COORDS, 1.0, 1.0, {
                    name = "lspd_app_pc",
                    heading = 90.0,
                    debugPoly = false,
                    minZ = 30.0,
                    maxZ = 32.0,
                }, {
                    options = {
                        {
                            icon = "fas fa-clipboard",
                            label = "Open LSPD Application",
                            action = function(entity)
                                OpenApplication()
                            end,
                        },
                    },
                    distance = APPLICATION_RADIUS
                })
            else
                print("Neither qb-target nor qtarget is running.")
                return;
            end
    end            
end)

-- NUI Callbacks
RegisterNUICallback('close', function(data, cb)
    CloseApplication()
    cb('ok')
end)

RegisterNUICallback('submit', function(data, cb)
    QBCore.Functions.TriggerCallback('lspd:submitApplication', function(result)
        SendNUIMessage({ action = 'submitResult', result = result })
        if result and result.success then
            QBCore.Functions.Notify(result.message or 'Application submitted!', 'success')
        else
            QBCore.Functions.Notify(result.error or 'Application failed', 'error')
        end

        cb('ok')
    end, data)
end)

