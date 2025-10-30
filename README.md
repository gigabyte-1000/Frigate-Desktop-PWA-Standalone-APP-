This is an electron app which packages the Frigate NVR PWA (Portable Web App), into a standalone desktop style app, it also adds functionality missing from PWA installs like a tray icon, isolation from the main web-browser and more, you just need to set a server IP, right click on tray icon - settings - server IP, restart app.

It does have a few downsides, server push notifications will not work in this app (not implemented in electron), I was going to implement a MQTT event listener and display notifications that way, but found HASS_assist met my needs for getting event notifications.
