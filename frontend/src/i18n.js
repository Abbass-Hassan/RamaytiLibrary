import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";

import ar from "./translations/ar.json";

const resources = {
  ar: { translation: ar },
};

i18n.use(initReactI18next).init(
  {
    lng: "ar", // Force Arabic language
    fallbackLng: "ar",
    resources,
    compatibilityJSON: "v3",
    interpolation: {
      escapeValue: false,
    },
  },
  () => {
    // Force RTL layout for Arabic
    if (!I18nManager.isRTL) {
      I18nManager.forceRTL(true);
      // Note: Changing RTL requires a full app reload to take effect.
    }
  }
);

export default i18n;
