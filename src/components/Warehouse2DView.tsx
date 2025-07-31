/* import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
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

  useEffect(() => {
    async function fetchData() {
      try {
        // Exemplo para 1 área (ID 1). Você pode tornar isso dinâmico.
        const fileiraRes = await axios.get(`/api/fileiras/area/1`);
        const fileirasData = await Promise.all(
          fileiraRes.data.map(async (fileira: any) => {
            const gradesRes = await axios.get(`/api/grades/fileira/${fileira.id}`);
            const gradesData = await Promise.all(
              gradesRes.data.map(async (grade: any) => {
                const niveisRes = await axios.get(`/api/niveis/grade/${grade.id}`);
                return {
                  ...grade,
                  niveis: niveisRes.data,
                };
              })
            );
            return {
              ...fileira,
              grades: gradesData,
            };
          })
        );
        setFileiras(fileirasData);
      } catch (error) {
        console.error('Erro ao carregar estrutura do estoque:', error);
      }
    }

    fetchData();
  }, []);

  return (
    <ScrollView>
      {fileiras.map((fileira) => (
        <View key={fileira.id} style={styles.fileiraContainer}>
          <Text style={styles.fileiraTitle}>Fileira {fileira.identificador}</Text>
          {fileira.grades.map((grade) => (
            <View key={grade.id} style={styles.gradeContainer}>
              <Text style={styles.gradeTitle}>Grade {grade.identificador}</Text>
              <View style={styles.niveisRow}>
                {grade.niveis.map((nivel) => (
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
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fileiraContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  fileiraTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gradeContainer: {
    marginBottom: 16,
  },
  gradeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  niveisRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nivelBox: {
    width: 80,
    height: 80,
    backgroundColor: '#e0e0e0',
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    borderRadius: 4,
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
 */