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
const RETRY_DESCRIPTION = 'Verifique a conexão com a API e tente novamente.';

export const API_STATE_MESSAGES: Record<
  'users' | 'history' | 'dashboard' | 'warehouse',
  ApiStateGroup
> = {
  users: {
    empty: {
      default: {
        title: 'Nenhum usuário disponível',
        description: 'Não há usuários cadastrados para exibir no momento.',
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
        title: 'Nenhum registro de histórico',
        description: 'Ainda não há movimentações registradas para exibir.',
      },
      filtered: {
        title: 'Nenhum registro encontrado',
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
        description: 'Não há itens para exibir no momento.',
      },
      filtered: {
        title: 'Nenhum item encontrado',
        description: FILTER_DESCRIPTION,
      },
    },
    error: {
      title: 'Não foi possível carregar o dashboard',
      description: RETRY_DESCRIPTION,
    },
  },
  warehouse: {
    empty: {
      default: {
        title: 'Nenhum dado do armazém',
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
