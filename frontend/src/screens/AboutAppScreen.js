import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import colors from "../config/colors";

const AboutAppScreen = () => {
  return (
    <View style={styles.container}>
      {/* Content */}
      <ScrollView style={styles.contentContainer}>
        <View style={styles.contentCard}>
          {/* Basmala */}
          <Text style={styles.basmala}>بسم الله الرحمن الرحيم</Text>

          {/* Main Content Paragraphs */}
          <Text style={styles.paragraph}>
            قد اجتهد الماضون من علمائنا(رضوان الله عليهم) على مر العصور في حفظ
            السنة الشريفة المتمثلة بأحاديث رسول الله(صلى الله عليه وآله) وأهل
            بيته الكرام(عليهم السلام) والتي تشكل ثاني مصادر التشريع بعد القرآن
            الكريم.
          </Text>

          <Text style={styles.paragraph}>
            أجل قد أتعبوا أبدانهم وصرفوا النفيس من أعمارهم في البحث والتنقيب
            والتمحيص والترتيب لتلك الأحاديث، حتى جمعت ودونت في موسوعات وأصبحت
            سهلة المنال لمن يريد أن ينهل من نميرها العذب.
          </Text>

          <Text style={styles.paragraph}>
            ومن أفضل الموسوعات التي صنفت في هذا المجال هو كتاب «وسائل الشيعة
            لتحصيل مسائل الشريعة» للمحدث الكبير والفقيه الجليل الشيخ الحر
            العاملي(قدس سره)، حيث جمع بين دفتيه ما يزيد على ثلاثين ألف حديث في
            فروع الدين.
          </Text>

          <Text style={styles.paragraph}>
            وقد أضافت إلى جماله جمالاً مؤسسة آل البيت(عليهم السلام) الموقرة إذ
            أخرجته بحلة جميلة وتحقيق رائع.
          </Text>

          <Text style={styles.paragraph}>
            ونحن بدورنا وتتميماً لتلك الجهود المباركة قمنا بانتاج هذا التطبيق
            الذي يشتمل على هذا الكتاب بتنسيق جيد وعرض رائع وميزات فريدة.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  basmala: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1E5B9B",
    marginBottom: 24,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: "#2D3748",
    textAlign: "right",
    marginBottom: 16,
  },
});

export default AboutAppScreen;
