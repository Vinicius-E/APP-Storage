import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Pressable,
  Animated,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import axios from 'axios';

interface Nivel {
  id: number;
  identificador: string;
  produtoNomeModelo?: string;
  quantidade?: number;
}
interface Grade {
  id: number;
  identificador: string;
  niveis: Nivel[];
}
interface Fileira {
  id: number;
  identificador: string;
  grades: Grade[];
}

export default function Warehouse2DView() {
  const [fileiras, setFileiras] = useState<Fileira[]>([]);
  const [expandedGrades, setExpandedGrades] = useState<number[]>([]);
  const [expandedFileiras, setExpandedFileiras] = useState<number[]>([]);
  const [widthAnims, setWidthAnims] = useState<Record<number, Animated.Value>>({});
  const [hoverFileira, setHoverFileira] = useState<Record<number, boolean>>({});
  const [hoverGrade, setHoverGrade] = useState<Record<number, boolean>>({});
  const [hoverNivel, setHoverNivel] = useState<Record<number, boolean>>({});

  const API = axios.create({ baseURL: 'http://localhost:8080/api' });

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const toggleGradeExpand = (grade: Grade) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const isExpanding = !expandedGrades.includes(grade.id);

    setExpandedGrades((prev) =>
      isExpanding ? [...prev, grade.id] : prev.filter((id) => id !== grade.id)
    );

    const baseWidth = 110;
    if (!widthAnims[grade.id]) {
      setWidthAnims((prev) => ({ ...prev, [grade.id]: new Animated.Value(baseWidth) }));
    }

    const perNivel = 88 + 8;
    const newWidth = isExpanding ? baseWidth + perNivel * (grade.niveis.length - 1) : baseWidth;

    const anim = widthAnims[grade.id] ?? new Animated.Value(baseWidth);
    Animated.timing(anim, {
      toValue: newWidth,
      duration: 280,
      useNativeDriver: false,
    }).start();
  };

  const toggleFileiraExpand = (fileira: Fileira) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const isExpanding = !expandedFileiras.includes(fileira.id);

    setExpandedFileiras((prev) =>
      isExpanding ? [...prev, fileira.id] : prev.filter((id) => id !== fileira.id)
    );

    fileira.grades.forEach((grade) => {
      const expanded = expandedGrades.includes(grade.id);
      if (isExpanding && !expanded) toggleGradeExpand(grade);
      if (!isExpanding && expanded) toggleGradeExpand(grade);
    });
  };

  useEffect(() => {
    async function fetchData() {
      const fileiraRes = await API.get('/fileiras/area/1');
      const fileirasData = await Promise.all(
        fileiraRes.data.map(async (f: any) => {
          const gradesRes = await API.get(`/grades/fileira/${f.id}`);
          const gradesData = await Promise.all(
            gradesRes.data.map(async (g: any) => {
              const niveisRes = await API.get(`/niveis/grade/${g.id}`);
              return { ...g, niveis: niveisRes.data };
            })
          );
          return { ...f, grades: gradesData };
        })
      );

      setFileiras(fileirasData);
      const anims: Record<number, Animated.Value> = {};
      fileirasData.forEach((f) =>
        f.grades.forEach((g: Grade) => (anims[g.id] = new Animated.Value(110)))
      );
      setWidthAnims(anims);
    }
    fetchData();
  }, []);

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
      nestedScrollEnabled
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fileirasRow}
        nestedScrollEnabled
      >
        {fileiras.map((fileira) => {
          const fileiraExpanded = expandedFileiras.includes(fileira.id);
          const isFileiraHovered = !!hoverFileira[fileira.id];

          return (
            <View key={fileira.id} style={styles.fileiraContainer}>
              {/* FILEIRA HEADER */}
              <Pressable
                onPress={() => toggleFileiraExpand(fileira)}
                onHoverIn={() => setHoverFileira((prev) => ({ ...prev, [fileira.id]: true }))}
                onHoverOut={() => setHoverFileira((prev) => ({ ...prev, [fileira.id]: false }))}
                style={({ pressed }) => [
                  styles.fileiraHeader,
                  isFileiraHovered && styles.hoverFileira,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.fileiraTitle,
                    (fileiraExpanded || isFileiraHovered) && { color: '#a98400fc' },
                  ]}
                >
                  Fileira {fileira.identificador}
                </Text>
                <AntDesign
                  name={fileiraExpanded ? 'caret-left' : 'caret-right'}
                  size={22}
                  color={fileiraExpanded ? '#a98400fc' : isFileiraHovered ? '#a98400fc' : 'black'}
                  style={isFileiraHovered ? styles.iconHover : undefined}
                />
              </Pressable>

              {/* GRADES */}
              {fileira.grades.map((grade) => {
                const expanded = expandedGrades.includes(grade.id);
                const widthAnim = widthAnims[grade.id] ?? new Animated.Value(110);
                const isGradeHovered = !!hoverGrade[grade.id];

                const niveisToShow = expanded
                  ? grade.niveis
                  : grade.niveis.filter((n) => n.identificador === 'N1');

                if (niveisToShow.length === 0) return null;

                return (
                  <Animated.View
                    key={grade.id}
                    style={[
                      styles.gradeAnimated,
                      { width: widthAnim },
                      expanded && styles.gradeExpanded,
                    ]}
                  >
                    <Pressable
                      onPress={() => toggleGradeExpand(grade)}
                      onHoverIn={() => setHoverGrade((prev) => ({ ...prev, [grade.id]: true }))}
                      onHoverOut={() => setHoverGrade((prev) => ({ ...prev, [grade.id]: false }))}
                      style={({ pressed }) => [
                        styles.gradeContainer,
                        isGradeHovered && styles.gradeHover,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <View style={styles.gradeHeader}>
                        <Text
                          style={[
                            styles.gradeTitle,
                            (isGradeHovered || isFileiraHovered) && { color: '#a98400fc' },
                          ]}
                        >
                          Grade {grade.identificador}
                        </Text>
                        <AntDesign
                          name={expanded ? 'caret-left' : 'caret-right'}
                          size={20}
                          color={expanded ? '#a98400fc' : isGradeHovered ? '#a98400fc' : 'black'}
                          style={isGradeHovered ? styles.iconHover : undefined}
                        />
                      </View>

                      {/* NÍVEIS */}
                      <View style={styles.niveisRow}>
                        {niveisToShow.map((nivel) => {
                          const isNivelHovered = !!hoverNivel[nivel.id];
                          return (
                            <Pressable
                              key={nivel.id}
                              onHoverIn={() =>
                                setHoverNivel((prev) => ({ ...prev, [nivel.id]: true }))
                              }
                              onHoverOut={() =>
                                setHoverNivel((prev) => ({ ...prev, [nivel.id]: false }))
                              }
                              style={[styles.nivelBox, isNivelHovered && styles.nivelHover]}
                            >
                              <Text
                                style={[styles.nivelText, isNivelHovered && { color: '#a98400fc' }]}
                              >
                                {nivel.identificador}
                              </Text>
                              {nivel.produtoNomeModelo && (
                                <>
                                  <Text style={styles.produto}>{nivel.produtoNomeModelo}</Text>
                                  <Text style={styles.qtd}>Qtd: {nivel.quantidade}</Text>
                                </>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fileirasRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 8 },
  fileiraContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginHorizontal: 8,
    padding: 12,
    elevation: 3,
    flexShrink: 0,
    flexGrow: 0,
    overflow: 'visible',
  },
  fileiraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  hoverFileira: { transform: [{ scale: 1.03 }] },
  fileiraTitle: { fontSize: 18, fontWeight: 'bold', color: 'black' },
  iconHover: { transform: [{ scale: 1.2 }] },

  gradeAnimated: { overflow: 'visible' },
  gradeContainer: {
    minWidth: 110,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'flex-start',
  },
  gradeExpanded: {
    borderColor: '#a98400fc',
    shadowColor: '#a98400fc',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
  },
  gradeHover: {
    transform: [{ scale: 1.04 }],
    borderColor: '#a98400fc',
    shadowColor: '#a98400fc',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  gradeHeader: {
    width: '100%',
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeTitle: { fontSize: 15, fontWeight: '600' },
  niveisRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
  },
  nivelBox: {
    width: 90,
    height: 90,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    transition: 'all 0.2s ease-in-out',
  },
  nivelHover: {
    backgroundColor: '#fff7e6',
    transform: [{ scale: 1.07 }],
    borderColor: '#a98400fc',
    borderWidth: 1,
    shadowColor: '#a98400fc',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  nivelText: { fontWeight: 'bold' },
  produto: { fontSize: 10, textAlign: 'center' },
  qtd: { fontSize: 10, color: '#333' },
});
