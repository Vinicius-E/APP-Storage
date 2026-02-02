import { API } from '../../axios';

export interface Nivel {
  id: number;
  identificador: string;
  produtoNomeModelo?: string;
  quantidade?: number;
}

export interface Grade {
  id: number;
  identificador: string;
  niveis: Nivel[];
}

export interface Fileira {
  id: number;
  identificador: string;
  grades: Grade[];
}

/**
 * Busca todas as fileiras de uma área
 */
export async function listarFileirasPorArea(idArea: number): Promise<Fileira[]> {
  try {
    const fileirasRes = await API.get<Fileira[]>(`/fileiras/area/${idArea}`);

    // Carrega grades e níveis de cada fileira
    const fileirasCompletas = await Promise.all(
      fileirasRes.data.map(async (fileira) => {
        const gradesRes = await API.get<Grade[]>(`/grades/fileira/${fileira.id}`);

        const gradesComNiveis = await Promise.all(
          gradesRes.data.map(async (grade) => {
            const niveisRes = await API.get<Nivel[]>(`/niveis/grade/${grade.id}`);
            return { ...grade, niveis: niveisRes.data };
          })
        );

        return { ...fileira, grades: gradesComNiveis };
      })
    );

    return fileirasCompletas;
  } catch (error: any) {
    console.error('Erro ao buscar estrutura do estoque:', error?.response?.data || error.message);
    return [];
  }
}
