ionic-module-pixlive
====================

Ionic (Angular) module for PixLive SDK (ionic >= 2)

How to use
----------

1. Install the PixLive plugin for Cordova. Follow the "Installation" instructions of the [cordova-plugin-pixlive](https://github.com/vidinoti/cordova-plugin-PixLive)
2. Install this plugin: `npm install ionic-module-pixlive`
3. Open the file `app.module.ts` and import the module: `import { PixliveModule } from 'ionic-module-pixlive';`
4. Add the module in the `imports` section of the `@NgModule` declaration
5. Add the Pixlive Component in an HTML page: `<pixlive style="width: 100%; height: 100%;"></pixlive>`

Contribute
----------

### How to build

```
npm install
npm run build
```

References
----------

https://medium.com/@cyrilletuzi/how-to-build-and-publish-an-angular-module-7ad19c0b4464

