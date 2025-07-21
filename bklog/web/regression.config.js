module.exports = {
  "project": {
    "root": '../../',
    "name": "blueking-log",
    "url": "http://appdev.woa.com:8001/",
    "buildCommand": "npm run build",
    "serveCommand": "npm run serve"
  },
  "scan": {
    "componentPaths": [
      "src/**/*.vue",
      "src/**/*.tsx",
      "src/**/*.ts"
    ],
    "excludePaths": [
      "node_modules",
      "dist",
      ".git",
      "src/components/test/**",
      "src/components/demo/**"
    ],
    "utilityPaths": [
      "src/**/*.js",
      "src/**/*.ts"
    ]
  },
  "mock": {
    "outputPath": "./regression-data/mock",
    "apiTimeout": 30000,
    "routes": [
      "/",
      "/dashboard",
      "/profile",
      "/settings"
    ]
  },
  "test": {
    "outputPath": "./regression-data/reports",
    "screenshotPath": "./regression-data/screenshots",
    "timeout": 60000,
    "retries": 2
  },
  "risk": {
    "criticalComponents": []
  }
};