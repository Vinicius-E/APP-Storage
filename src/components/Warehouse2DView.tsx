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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
  const [widthAnims, setWidthAnims] = useState<Record<number, Animated.Value>>({});

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

    if (!widthAnims[grade.id]) {
      setWidthAnims((prev) => ({ ...prev, [grade.id]: new Animated.Value(50) }));
    }

    // width grows according to number of Níveis
    const baseWidth = 200;
    const perNivel = 75; // pixels per N
    const newWidth = isExpanding ? baseWidth + perNivel * (grade.niveis.length - 1) : baseWidth;

    const anim = widthAnims[grade.id] ?? new Animated.Value(baseWidth);
    Animated.timing(anim, {
      toValue: newWidth,
      duration: 280,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    async function fetchData() {
      const fileiraRes = await API.get('/fileiras/area/1');
      const fileirasData = await Promise.all(
        fileiraRes.data.map(async (fileira: any) => {
          const gradesRes = await API.get(`/grades/fileira/${fileira.id}`);
          const gradesData = await Promise.all(
            gradesRes.data.map(async (grade: any) => {
              const niveisRes = await API.get(`/niveis/grade/${grade.id}`);
              return { ...grade, niveis: niveisRes.data };
            })
          );
          return { ...fileira, grades: gradesData };
        })
      );
      setFileiras(fileirasData);

      const anims: Record<number, Animated.Value> = {};
      fileirasData.forEach((f) =>
        f.grades.forEach((g: Grade) => (anims[g.id] = new Animated.Value(200)))
      );
      setWidthAnims(anims);
    }
    fetchData();
  }, []);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.fileirasRow}
    >
      {fileiras.map((fileira) => (
        <View key={fileira.id} style={styles.fileiraContainer}>
          <Text style={styles.fileiraTitle}>Fileira {fileira.identificador}</Text>

          {fileira.grades.map((grade) => {
            const isExpanded = expandedGrades.includes(grade.id);
            const widthAnim = widthAnims[grade.id] ?? new Animated.Value(200);
            const niveisToShow = isExpanded
              ? grade.niveis
              : grade.niveis.filter((n) => n.identificador === 'N1');

            if (niveisToShow.length === 0) return null;

            return (
              <Animated.View
                key={grade.id}
                style={[
                  styles.gradeAnimated,
                  { width: widthAnim },
                  isExpanded && styles.gradeExpanded,
                ]}
              >
                <Pressable
                  onPress={() => toggleGradeExpand(grade)}
                  style={({ hovered }) => [styles.gradeContainer, hovered && styles.gradeHover]}
                >
                  <View style={styles.gradeHeader}>
                    <Text style={styles.gradeTitle}>Grade {grade.identificador}</Text>
                    <Icon
                      name={isExpanded ? 'chevron-left' : 'chevron-right'}
                      size={20}
                      color={isExpanded ? '#0d6efd' : '#777'}
                    />
                  </View>

                  <View style={styles.niveisRow}>
                    {niveisToShow.map((nivel) => (
                      <View key={nivel.id} style={styles.nivelBox}>
                        <Text style={styles.nivelText}>{nivel.identificador}</Text>
                        {nivel.produtoNomeModelo && (
                          <>
                            <Text style={styles.produto}>{nivel.produtoNomeModelo}</Text>
                            <Text style={styles.qtd}>Qtd: {nivel.quantidade}</Text>
                          </>
                        )}
                      </View>
                    ))}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fileirasRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  fileiraContainer: {
    //minWidth: 220, // 👈 ensures base width (stable columns)
    alignSelf: 'flex-start',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginHorizontal: 8,
    padding: 12,
    elevation: 3,
    flexShrink: 0, // prevents collapsing
    flexGrow: 0, // prevents stretching
    overflow: 'visible', // allows expanded grades to render outside
    position: 'relative',
  },

  fileiraTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gradeAnimated: {
    overflow: 'visible',
  },
  gradeContainer: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#ddd',
    flexShrink: 0,
    transition: 'transform 0.2s, box-shadow 0.2s',
  } as any,
  gradeExpanded: {
    borderColor: '#0d6efd',
    elevation: 6,
    shadowColor: '#0d6efd',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    zIndex: 3,
  },
  gradeHover: {
    transform: [{ scale: 1.04 }],
    borderColor: '#b3d0ff',
    shadowColor: '#0d6efd',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  gradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gradeTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  niveisRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
  },
  nivelBox: {
    width: 88,
    height: 88,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  nivelText: {
    fontWeight: 'bold',
  },
  produto: {
    fontSize: 10,
    textAlign: 'center',
  },
  qtd: {
    fontSize: 10,
    color: '#333',
  },
});
