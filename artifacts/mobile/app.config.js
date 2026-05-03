const devDomain = process.env.REPLIT_DEV_DOMAIN;
const apiUrl = devDomain ? `https://${devDomain}` : "";

module.exports = {
  expo: {
    name: "Storytime",
    slug: "mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mobile",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#FDF6E3",
    },
    ios: {
      supportsTablet: false,
    },
    android: {},
    web: {
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      [
        "expo-router",
        {
          origin: "https://replit.com/",
        },
      ],
      "expo-font",
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      apiUrl,
    },
  },
};
