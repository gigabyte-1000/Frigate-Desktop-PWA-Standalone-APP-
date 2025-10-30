This is an electron app which packages the Frigate NVR PWA (Portable Web App), into a standalone desktop style program, it also adds functionality missing from PWA installs like a tray icon, isolation from the main web-browser and more, you just need to set a server IP, right click on tray icon - settings - server IP, restart app, it should show the frigate login page like you would see in the web browser.

It does have a few downsides, server push notifications will not work in this app (not implemented in electron), I was going to implement a MQTT event listener and display notifications that way, but found HASS_assist met my needs for getting event notifications.
TODO:
Notification support.

This is an unoffical app, and it is provided as-is, this app uses electron, and the frigate icon.
Please dont report issues with this app to the frigate developers or vice verse, I have no control over the PWA or it's function.

Build (linux -> windows binaries)
npm install
npm install electron
npm electron-packager 
npm run package-win

copy FrigateTray-win32-x64 to a sutible folder on pc and run.
