// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

//TODO Update base URL before compiling for production
export const environment = {
  production: false,
  // apiUrl:'https://eimtapi.cengkuru.com/api'
  apiUrl:'http://127.0.0.1:8000/api',
  firebaseConfig: {
    apiKey: "AIzaSyAsqPYsZeT85x72WqfzDWwh61QhkZptyuM",
    authDomain: "knowledgehub-2ed2f.firebaseapp.com",
    projectId: "knowledgehub-2ed2f",
    storageBucket: "knowledgehub-2ed2f.firebasestorage.app",
    messagingSenderId: "442740476986",
    appId: "1:442740476986:web:77a9c6a79593314c74f903",
    measurementId: "G-92MHFZ8698"
  }
};
/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
