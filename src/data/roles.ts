export interface FinancialItem {
  name: string
  amount: number
}

export interface RoleFinancialData {
  income: {
    items: FinancialItem[]
    total: number
  }
  expenses: {
    items: FinancialItem[]
    total: number
  }
  assets: FinancialItem[]
  liabilities: FinancialItem[]
  monthlyCashFlow: number
}

interface RoleData {
  name: string
  financialData: RoleFinancialData
}

export const roleKeys = [
  'policeOfficer',
  'teacher',
  'doctor',
  'airlinePilot',
  'autoMechanic',
  'engineer',
  'secretary',
  'manager',
  'nurse',
  'lawyer',
  'janitor',
  'driver',
] as const

export type RoleKey = (typeof roleKeys)[number]

export const roleNames: Record<string, string> = {
  policeOfficer: 'Офицер полиции',
  teacher: 'Учитель',
  doctor: 'Врач',
  airlinePilot: 'Пилот авиалинии',
  autoMechanic: 'Автомеханик',
  engineer: 'Инженер',
  secretary: 'Секретарь',
  manager: 'Менеджер',
  nurse: 'Медсестра',
  lawyer: 'Адвокат',
  janitor: 'Дворник',
  driver: 'Водитель',
}

export const roleData: Record<string, RoleData> = {
  policeOfficer: {
    name: 'Офицер полиции',
    financialData: {
      income: {
        items: [
          { name: 'Зарплата', amount: 7500 },
          { name: 'Проценты', amount: 0 },
          { name: 'Дивиденты', amount: 0 },
        ],
        total: 7500,
      },
      expenses: {
        items: [
          { name: 'Налоги', amount: 280 },
          { name: 'Выплата по ипотеке и арендная плата', amount: 280 },
          { name: 'Выплата по кредиту на образование', amount: 280 },
          { name: 'Выплаты по автокредиту', amount: 280 },
          { name: 'Выплаты по кредитным карточкам', amount: 280 },
          { name: 'Выплаты по мелким кредитам', amount: 280 },
          { name: 'Прочие расходы', amount: 280 },
          { name: 'Расходы на детей', amount: 280 },
        ],
        total: 6500,
      },
      assets: [{ name: 'Сбережения', amount: 7500 }],
      liabilities: [
        { name: 'Ипотека', amount: 560 },
        { name: 'Кредиты на образование', amount: 560 },
        { name: 'Кредит на машину', amount: 560 },
        { name: 'Кредитные карточки', amount: 560 },
        { name: 'Мелкие сделки', amount: 560 },
      ],
      monthlyCashFlow: 1000,
    },
  },

  teacher: {
    name: 'Учитель',
    financialData: {
      income: {
        items: [
          { name: 'Зарплата', amount: 4200 },
          { name: 'Репетиторство', amount: 800 },
          { name: 'Проценты', amount: 0 },
        ],
        total: 5000,
      },
      expenses: {
        items: [
          { name: 'Налоги', amount: 180 },
          { name: 'Аренда жилья', amount: 350 },
          { name: 'Выплата по кредиту на образование', amount: 120 },
          { name: 'Выплаты по кредитным карточкам', amount: 80 },
          { name: 'Прочие расходы', amount: 200 },
        ],
        total: 3500,
      },
      assets: [{ name: 'Сбережения', amount: 2000 }],
      liabilities: [
        { name: 'Кредиты на образование', amount: 240 },
        { name: 'Кредитные карточки', amount: 80 },
      ],
      monthlyCashFlow: 1500,
    },
  },

  doctor: {
    name: 'Врач',
    financialData: {
      income: {
        items: [
          { name: 'Зарплата', amount: 12000 },
          { name: 'Частная практика', amount: 3000 },
          { name: 'Проценты', amount: 500 },
          { name: 'Дивиденты', amount: 200 },
        ],
        total: 15700,
      },
      expenses: {
        items: [
          { name: 'Налоги', amount: 1800 },
          { name: 'Выплата по ипотеке', amount: 450 },
          { name: 'Выплаты по автокредиту', amount: 350 },
          { name: 'Выплаты по кредитным карточкам', amount: 200 },
          { name: 'Страховка', amount: 300 },
          { name: 'Прочие расходы', amount: 500 },
        ],
        total: 12000,
      },
      assets: [
        { name: 'Сбережения', amount: 15000 },
        { name: 'Инвестиционный портфель', amount: 5000 },
      ],
      liabilities: [
        { name: 'Ипотека', amount: 1200 },
        { name: 'Кредит на машину', amount: 350 },
        { name: 'Кредитные карточки', amount: 200 },
      ],
      monthlyCashFlow: 3700,
    },
  },

  airlinePilot: {
    name: 'Пилот авиалинии',
    financialData: {
      income: {
        items: [
          { name: 'Зарплата', amount: 18000 },
          { name: 'Проценты', amount: 1200 },
          { name: 'Дивиденты', amount: 800 },
          { name: 'Премии', amount: 3000 },
        ],
        total: 23000,
      },
      expenses: {
        items: [
          { name: 'Налоги', amount: 2500 },
          { name: 'Выплата по ипотеке', amount: 800 },
          { name: 'Выплаты по автокредиту', amount: 500 },
          { name: 'Выплаты по кредитным карточкам', amount: 300 },
          { name: 'Страховка', amount: 600 },
          { name: 'Прочие расходы', amount: 700 },
          { name: 'Расходы на детей', amount: 400 },
        ],
        total: 17000,
      },
      assets: [
        { name: 'Сбережения', amount: 50000 },
        { name: 'Инвестиционный портфель', amount: 20000 },
        { name: 'Недвижимость', amount: 10000 },
      ],
      liabilities: [
        { name: 'Ипотека', amount: 2000 },
        { name: 'Кредит на машину', amount: 500 },
        { name: 'Кредитные карточки', amount: 300 },
      ],
      monthlyCashFlow: 6000,
    },
  },

  autoMechanic: {
    name: 'Автомеханик',
    financialData: {
      income: {
        items: [
          { name: 'Зарплата', amount: 3200 },
          { name: 'Подработки', amount: 1200 },
          { name: 'Проценты', amount: 0 },
        ],
        total: 4400,
      },
      expenses: {
        items: [
          { name: 'Налоги', amount: 150 },
          { name: 'Аренда жилья', amount: 280 },
          { name: 'Выплаты по автокредиту', amount: 180 },
          { name: 'Выплаты по кредитным карточкам', amount: 60 },
          { name: 'Прочие расходы', amount: 160 },
        ],
        total: 3200,
      },
      assets: [{ name: 'Сбережения', amount: 1500 }],
      liabilities: [
        { name: 'Кредит на машину', amount: 180 },
        { name: 'Кредитные карточки', amount: 60 },
      ],
      monthlyCashFlow: 1200,
    },
  },

  engineer: {
    name: 'Инженер',
    financialData: {
      income: {
        items: [
          { name: 'Зарплата', amount: 8500 },
          { name: 'Проценты', amount: 200 },
          { name: 'Дивиденты', amount: 100 },
        ],
        total: 8800,
      },
      expenses: {
        items: [
          { name: 'Налоги', amount: 500 },
          { name: 'Выплата по ипотеке', amount: 320 },
          { name: 'Выплаты по автокредиту', amount: 200 },
          { name: 'Выплаты по кредитным карточкам', amount: 100 },
          { name: 'Прочие расходы', amount: 300 },
          { name: 'Расходы на детей', amount: 200 },
        ],
        total: 7000,
      },
      assets: [
        { name: 'Сбережения', amount: 8000 },
        { name: 'Инвестиционный портфель', amount: 3000 },
      ],
      liabilities: [
        { name: 'Ипотека', amount: 800 },
        { name: 'Кредит на машину', amount: 200 },
        { name: 'Кредитные карточки', amount: 100 },
      ],
      monthlyCashFlow: 1800,
    },
  },

  secretary: {
    name: 'Секретарь',
    financialData: {
      income: {
        items: [
          { name: 'Зарплата', amount: 2800 },
          { name: 'Проценты', amount: 0 },
          { name: 'Дивиденты', amount: 0 },
        ],
        total: 2800,
      },
      expenses: {
        items: [
          { name: 'Налоги', amount: 100 },
          { name: 'Аренда жилья', amount: 220 },
          { name: 'Выплаты по кредитным карточкам', amount: 40 },
          { name: 'Прочие расходы', amount: 120 },
        ],
        total: 2200,
      },
      assets: [{ name: 'Сбережения', amount: 500 }],
      liabilities: [{ name: 'Кредитные карточки', amount: 40 }],
      monthlyCashFlow: 600,
    },
  },

  manager: {
    name: 'Менеджер',
    financialData: {
      income: {
        items: [
          { name: 'Зарплата', amount: 6500 },
          { name: 'Проценты', amount: 300 },
          { name: 'Дивиденты', amount: 150 },
          { name: 'Бонусы', amount: 1000 },
        ],
        total: 7950,
      },
      expenses: {
        items: [
          { name: 'Налоги', amount: 600 },
          { name: 'Выплата по ипотеке', amount: 350 },
          { name: 'Выплаты по автокредиту', amount: 250 },
          { name: 'Выплаты по кредитным карточкам', amount: 150 },
          { name: 'Прочие расходы', amount: 350 },
          { name: 'Расходы на детей', amount: 250 },
        ],
        total: 6000,
      },
      assets: [
        { name: 'Сбережения', amount: 10000 },
        { name: 'Инвестиционный портфель', amount: 5000 },
      ],
      liabilities: [
        { name: 'Ипотека', amount: 900 },
        { name: 'Кредит на машину', amount: 250 },
        { name: 'Кредитные карточки', amount: 150 },
      ],
      monthlyCashFlow: 1950,
    },
  },

  nurse: {
    name: 'Медсестра',
    financialData: {
      income: {
        items: [
          { name: 'Зарплата', amount: 3500 },
          { name: 'Проценты', amount: 0 },
          { name: 'Дивиденты', amount: 0 },
        ],
        total: 3500,
      },
      expenses: {
        items: [
          { name: 'Налоги', amount: 120 },
          { name: 'Аренда жилья', amount: 250 },
          { name: 'Выплаты по кредитным карточкам', amount: 50 },
          { name: 'Прочие расходы', amount: 150 },
          { name: 'Расходы на детей', amount: 100 },
        ],
        total: 2800,
      },
      assets: [{ name: 'Сбережения', amount: 1000 }],
      liabilities: [{ name: 'Кредитные карточки', amount: 50 }],
      monthlyCashFlow: 700,
    },
  },

  lawyer: {
    name: 'Адвокат',
    financialData: {
      income: {
        items: [
          { name: 'Зарплата', amount: 15000 },
          { name: 'Проценты', amount: 1500 },
          { name: 'Дивиденты', amount: 1000 },
          { name: 'Консультации', amount: 3500 },
        ],
        total: 21000,
      },
      expenses: {
        items: [
          { name: 'Налоги', amount: 3000 },
          { name: 'Выплата по ипотеке', amount: 600 },
          { name: 'Выплаты по автокредиту', amount: 400 },
          { name: 'Выплаты по кредитным карточкам', amount: 250 },
          { name: 'Страховка', amount: 500 },
          { name: 'Прочие расходы', amount: 600 },
          { name: 'Расходы на детей', amount: 350 },
        ],
        total: 16000,
      },
      assets: [
        { name: 'Сбережения', amount: 40000 },
        { name: 'Инвестиционный портфель', amount: 15000 },
        { name: 'Недвижимость', amount: 8000 },
      ],
      liabilities: [
        { name: 'Ипотека', amount: 1500 },
        { name: 'Кредит на машину', amount: 400 },
        { name: 'Кредитные карточки', amount: 250 },
      ],
      monthlyCashFlow: 5000,
    },
  },

  janitor: {
    name: 'Дворник',
    financialData: {
      income: {
        items: [
          { name: 'Зарплата', amount: 1800 },
          { name: 'Проценты', amount: 0 },
          { name: 'Дивиденты', amount: 0 },
        ],
        total: 1800,
      },
      expenses: {
        items: [
          { name: 'Налоги', amount: 60 },
          { name: 'Аренда жилья', amount: 150 },
          { name: 'Прочие расходы', amount: 100 },
        ],
        total: 1400,
      },
      assets: [{ name: 'Сбережения', amount: 200 }],
      liabilities: [],
      monthlyCashFlow: 400,
    },
  },

  driver: {
    name: 'Водитель',
    financialData: {
      income: {
        items: [
          { name: 'Зарплата', amount: 2500 },
          { name: 'Чаевые', amount: 500 },
          { name: 'Проценты', amount: 0 },
        ],
        total: 3000,
      },
      expenses: {
        items: [
          { name: 'Налоги', amount: 90 },
          { name: 'Аренда жилья', amount: 200 },
          { name: 'Выплаты по автокредиту', amount: 150 },
          { name: 'Выплаты по кредитным карточкам', amount: 40 },
          { name: 'Прочие расходы', amount: 130 },
        ],
        total: 2500,
      },
      assets: [{ name: 'Сбережения', amount: 800 }],
      liabilities: [
        { name: 'Кредит на машину', amount: 150 },
        { name: 'Кредитные карточки', amount: 40 },
      ],
      monthlyCashFlow: 500,
    },
  },
}

export const icons = import.meta.glob<{ default: string }>('/src/assets/roles/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})
