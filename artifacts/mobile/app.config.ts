import type { ExpoConfig } from "expo/config";

export default (): ExpoConfig => {
  const metaAppId = process.env["META_APP_ID"] ?? "";
  const metaClientToken = process.env["META_CLIENT_TOKEN"] ?? "";
  const hasMetaConfig = !!(metaAppId && metaClientToken);

  const plugins: ExpoConfig["plugins"] = [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    [
      "expo-tracking-transparency",
      {
        userTrackingPermission:
          "This helps us show you relevant ads and improve your experience.",
      },
    ],
  ];

  if (hasMetaConfig) {
    plugins.push([
      "react-native-fbsdk-next",
      {
        appID: metaAppId,
        clientToken: metaClientToken,
        displayName: "StoryLamp",
        advertiserIDCollectionEnabled: true,
        autoLogAppEventsEnabled: false,
        scheme: `fb${metaAppId}`,
      },
    ]);
  }

  return {
    name: "StoryLamp",
    slug: "storybox",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: ["storylamp", "storytime", "mobile"],
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#FDF6E3",
    },
    ios: {
      supportsTablet: false,
    },
    android: {
      package: "com.storylamp.kids",
      permissions: [
        "android.permission.INTERNET",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
        "android.permission.POST_NOTIFICATIONS",
      ],
    },
    web: {
      favicon: "./assets/images/icon.png",
    },
    plugins,
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        projectId: "38ae98dd-fbd4-4049-b619-58df4266e226",
      },
    },
    owner: "haanipyds-organization",
  };
};
