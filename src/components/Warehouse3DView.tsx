/* import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber/native';
import { OrbitControls, Text, Box } from '@react-three/drei/native';
import axios from 'axios';
import { View } from 'react-native';

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

export default function Warehouse3DView() {
  const [fileiras, setFileiras] = useState<Fileira[]>([]);

  useEffect(() => {
    async function fetchData() {
      const fileiraRes = await axios.get(`/api/fileiras/area/1`);
      const fileirasData = await Promise.all(
        fileiraRes.data.map(async (fileira: any) => {
          const gradesRes = await axios.get(`/api/grades/fileira/${fileira.id}`);
          const gradesData = await Promise.all(
            gradesRes.data.map(async (grade: any) => {
              const niveisRes = await axios.get(`/api/niveis/grade/${grade.id}`);
              return { ...grade, niveis: niveisRes.data };
            })
          );
          return { ...fileira, grades: gradesData };
        })
      );
      setFileiras(fileirasData);
    }

    fetchData();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Canvas camera={{ position: [10, 10, 20], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} />
        <OrbitControls />

        {fileiras.map((fileira, fIndex) =>
          fileira.grades.map((grade, gIndex) =>
            grade.niveis.map((nivel, nIndex) => {
              const x = fIndex * 3;
              const y = nIndex * 1.2;
              const z = gIndex * 3;

              return (
                <group key={nivel.id}>
                  <Box position={[x, y, z]}>
                    <meshStandardMaterial
                      attach="material"
                      color={nivel.quantidade ? '#4caf50' : '#ccc'}
                    />
                  </Box>
                  <Text
                    position={[x, y + 0.7, z]}
                    fontSize={0.3}
                    color="black"
                    anchorX="center"
                    anchorY="middle"
                  >
                    {nivel.identificador}
                  </Text>
                </group>
              );
            })
          )
        )}
      </Canvas>
    </View>
  );
}
 */