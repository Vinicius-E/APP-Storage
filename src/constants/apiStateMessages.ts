export type ApiStateCopy = {
  title: string;
  description: string;
};

type ApiStateGroup = {
  empty: {
    default: ApiStateCopy;
    filtered: ApiStateCopy;
  };
  error: ApiStateCopy;
};

const FILTER_DESCRIPTION = 'Tente ajustar os filtros para visualizar resultados.';
const RETRY_DESCRIPTION = 'Verifique sua conexão e tente novamente.';

export const API_STATE_MESSAGES: Record<
  'users' | 'history' | 'dashboard' | 'warehouse',
  ApiStateGroup
> = {
  users: {
    empty: {
      default: {
        title: 'Nenhum usuário cadastrado',
        description: "Clique em 'Novo usuário' para começar.",
      },
      filtered: {
        title: 'Nenhum usuário encontrado',
        description: FILTER_DESCRIPTION,
      },
    },
    error: {
      title: 'Não foi possível carregar os usuários',
      description: RETRY_DESCRIPTION,
    },
  },
  history: {
    empty: {
      default: {
        title: 'Nenhuma movimentação registrada',
        description: 'As movimentações de estoque aparecerão aqui.',
      },
      filtered: {
        title: 'Nenhuma movimentação encontrada',
        description: FILTER_DESCRIPTION,
      },
    },
    error: {
      title: 'Não foi possível carregar o histórico',
      description: RETRY_DESCRIPTION,
    },
  },
  dashboard: {
    empty: {
      default: {
        title: 'Nenhum item em estoque',
        description: 'Não há itens cadastrados para exibir no momento.',
      },
      filtered: {
        title: 'Nenhum item encontrado',
        description: FILTER_DESCRIPTION,
      },
    },
    error: {
      title: 'Não foi possível carregar o estoque',
      description: RETRY_DESCRIPTION,
    },
  },
  warehouse: {
    empty: {
      default: {
        title: 'Nenhum dado nesta área',
        description: 'Não há fileiras, grades ou níveis cadastrados para exibir.',
      },
      filtered: {
        title: 'Nenhum dado encontrado',
        description: FILTER_DESCRIPTION,
      },
    },
    error: {
      title: 'Não foi possível carregar o armazém',
      description: RETRY_DESCRIPTION,
    },
  },
};

export function getApiEmptyCopy(
  scope: keyof typeof API_STATE_MESSAGES,
  hasFilters: boolean
): ApiStateCopy {
  return hasFilters
    ? API_STATE_MESSAGES[scope].empty.filtered
    : API_STATE_MESSAGES[scope].empty.default;
}
