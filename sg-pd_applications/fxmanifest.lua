-- fxmanifest.lua
fx_version 'cerulean'
game 'gta5'

author 'YourName'
description 'LSPD Application Form - NUI with QBCore Integration'
version '1.0.0'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js',
    'html/images/*'
}

shared_script {
    'config.lua'
}

client_scripts {
    'client.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',   
    'server.lua'
}

dependencies {
    'qb-core',
    'oxmysql'
}
