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
  policeOfficer: "Офицер полиции",
  teacher: "Учитель",
  doctor: "Врач",
  airlinePilot: "Пилот авиалиний",
  autoMechanic: "Автомеханик",
  engineer: "Инженер",
  secretary: "Секретарь",
  manager: "Менеджер",
  nurse: "Медсестра",
  lawyer: "Адвокат",
  janitor: "Дворник",
  driver: "Водитель грузовика",
}

export const roleData: Record<string, RoleData> = {
  policeOfficer: {
    name: "Офицер полиции",
    financialData: {
      income: {
        items: [
          { name: "Зарплата", amount: 3000 },
          { name: "Проценты", amount: 0 },
          { name: "Дивиденды", amount: 0 },
          { name: "Недвиж. и предприятия", amount: 0 },
          { name: "Пассивный доход", amount: 0 },
        ],
        total: 3000,
      },
      expenses: {
        items: [
          { name: "Налоги", amount: 580 },
          { name: "Ипотека и аренд. плата", amount: 400 },
          { name: "Кредит на образование", amount: 0 },
          { name: "Кредит на машину", amount: 100 },
          { name: "Кредитная карточка", amount: 60 },
          { name: "Мелкие кредиты", amount: 50 },
          { name: "Прочие расходы", amount: 690 },
          { name: "Расходы на детей", amount: 0 },
        ],
        total: 1880,
      },
      assets: [
          { name: "Сбережения", amount: 520 },
      ],
      liabilities: [
          { name: "Ипотека", amount: 46000 },
          { name: "Кредиты на машину", amount: 5000 },
          { name: "Кредитные карточки", amount: 2000 },
          { name: "Мелкие кредиты.1", amount: 1000 },
      ],
      monthlyCashFlow: 1120,
    },
  },

  teacher: {
    name: "Учитель",
    financialData: {
      income: {
        items: [
          { name: "Зарплата", amount: 3300 },
          { name: "Проценты", amount: 0 },
          { name: "Дивиденды", amount: 0 },
          { name: "Недвиж. и предприятия", amount: 0 },
          { name: "Пассивный доход", amount: 0 },
        ],
        total: 3300,
      },
      expenses: {
        items: [
          { name: "Налоги", amount: 630 },
          { name: "Ипотека и аренд. плата", amount: 500 },
          { name: "Кредит на образование", amount: 60 },
          { name: "Кредит на машину", amount: 90 },
          { name: "Кредитная карточка", amount: 90 },
          { name: "Мелкие кредиты", amount: 50 },
          { name: "Прочие расходы", amount: 770 },
          { name: "Расходы на детей", amount: 0 },
        ],
        total: 2190,
      },
      assets: [
          { name: "Сбережения", amount: 400 },
      ],
      liabilities: [
          { name: "Ипотека", amount: 50000 },
          { name: "Кредиты на образование", amount: 12000 },
          { name: "Кредиты на машину", amount: 5000 },
          { name: "Кредитные карточки", amount: 3000 },
          { name: "Мелкие кредиты.1", amount: 1000 },
      ],
      monthlyCashFlow: 1110,
    },
  },

  doctor: {
    name: "Врач",
    financialData: {
      income: {
        items: [
          { name: "Зарплата", amount: 13200 },
          { name: "Проценты", amount: 0 },
          { name: "Дивиденды", amount: 0 },
          { name: "Недвиж. и предприятия", amount: 0 },
          { name: "Пассивный доход", amount: 0 },
        ],
        total: 13200,
      },
      expenses: {
        items: [
          { name: "Налоги", amount: 3420 },
          { name: "Ипотека и аренд. плата", amount: 1900 },
          { name: "Кредит на образование", amount: 750 },
          { name: "Кредит на машину", amount: 380 },
          { name: "Кредитная карточка", amount: 270 },
          { name: "Мелкие кредиты", amount: 50 },
          { name: "Прочие расходы", amount: 2880 },
          { name: "Расходы на детей", amount: 0 },
        ],
        total: 9650,
      },
      assets: [
          { name: "Сбережения", amount: 400 },
      ],
      liabilities: [
          { name: "Ипотека", amount: 202000 },
          { name: "Кредиты на образование", amount: 150000 },
          { name: "Кредиты на машину", amount: 19000 },
          { name: "Кредитные карточки", amount: 9000 },
          { name: "Мелкие кредиты.1", amount: 1000 },
      ],
      monthlyCashFlow: 3550,
    },
  },

  airlinePilot: {
    name: "Пилот авиалиний",
    financialData: {
      income: {
        items: [
          { name: "Зарплата", amount: 9500 },
          { name: "Проценты", amount: 0 },
          { name: "Дивиденды", amount: 0 },
          { name: "Недвиж. и предприятия", amount: 0 },
          { name: "Пассивный доход", amount: 0 },
        ],
        total: 9500,
      },
      expenses: {
        items: [
          { name: "Налоги", amount: 2350 },
          { name: "Ипотека и аренд. плата", amount: 1330 },
          { name: "Кредит на образование", amount: 300 },
          { name: "Кредит на машину", amount: 660 },
          { name: "Кредитная карточка", amount: 300 },
          { name: "Мелкие кредиты", amount: 50 },
          { name: "Прочие расходы", amount: 1910 },
          { name: "Расходы на детей", amount: 0 },
        ],
        total: 6900,
      },
      assets: [
          { name: "Сбережения", amount: 400 },
      ],
      liabilities: [
          { name: "Ипотека", amount: 143000 },
          { name: "Кредиты на образование", amount: 16000 },
          { name: "Кредиты на машину", amount: 22000 },
          { name: "Кредитные карточки", amount: 1000 },
          { name: "Мелкие кредиты.1", amount: 1000 },
      ],
      monthlyCashFlow: 2600,
    },
  },

  autoMechanic: {
    name: "Автомеханик",
    financialData: {
      income: {
        items: [
          { name: "Зарплата", amount: 2000 },
          { name: "Проценты", amount: 0 },
          { name: "Дивиденды", amount: 0 },
          { name: "Недвиж. и предприятия", amount: 0 },
          { name: "Пассивный доход", amount: 0 },
        ],
        total: 2000,
      },
      expenses: {
        items: [
          { name: "Налоги", amount: 360 },
          { name: "Ипотека и аренд. плата", amount: 300 },
          { name: "Кредит на образование", amount: 0 },
          { name: "Кредит на машину", amount: 60 },
          { name: "Кредитная карточка", amount: 60 },
          { name: "Мелкие кредиты", amount: 50 },
          { name: "Прочие расходы", amount: 450 },
          { name: "Расходы на детей", amount: 0 },
        ],
        total: 1280,
      },
      assets: [
          { name: "Сбережения", amount: 670 },
      ],
      liabilities: [
          { name: "Ипотека", amount: 31000 },
          { name: "Кредиты на машину", amount: 3000 },
          { name: "Кредитные карточки", amount: 2000 },
          { name: "Мелкие кредиты.1", amount: 1000 },
      ],
      monthlyCashFlow: 720,
    },
  },

  engineer: {
    name: "Инженер",
    financialData: {
      income: {
        items: [
          { name: "Зарплата", amount: 4900 },
          { name: "Проценты", amount: 0 },
          { name: "Дивиденды", amount: 0 },
          { name: "Недвиж. и предприятия", amount: 0 },
          { name: "Пассивный доход", amount: 0 },
        ],
        total: 4900,
      },
      expenses: {
        items: [
          { name: "Налоги", amount: 1050 },
          { name: "Ипотека и аренд. плата", amount: 700 },
          { name: "Кредит на образование", amount: 60 },
          { name: "Кредит на машину", amount: 140 },
          { name: "Кредитная карточка", amount: 120 },
          { name: "Мелкие кредиты", amount: 50 },
          { name: "Прочие расходы", amount: 1090 },
          { name: "Расходы на детей", amount: 0 },
        ],
        total: 3210,
      },
      assets: [
          { name: "Сбережения", amount: 400 },
      ],
      liabilities: [
          { name: "Ипотека", amount: 75000 },
          { name: "Кредиты на образование", amount: 12000 },
          { name: "Кредиты на машину", amount: 7000 },
          { name: "Кредитные карточки", amount: 4000 },
          { name: "Мелкие кредиты.1", amount: 1000 },
      ],
      monthlyCashFlow: 1690,
    },
  },

  secretary: {
    name: "Секретарь",
    financialData: {
      income: {
        items: [
          { name: "Зарплата", amount: 2500 },
          { name: "Проценты", amount: 0 },
          { name: "Дивиденды", amount: 0 },
          { name: "Недвиж. и предприятия", amount: 0 },
          { name: "Пассивный доход", amount: 0 },
        ],
        total: 2500,
      },
      expenses: {
        items: [
          { name: "Налоги", amount: 460 },
          { name: "Ипотека и аренд. плата", amount: 400 },
          { name: "Кредит на образование", amount: 0 },
          { name: "Кредит на машину", amount: 80 },
          { name: "Кредитная карточка", amount: 60 },
          { name: "Мелкие кредиты", amount: 50 },
          { name: "Прочие расходы", amount: 570 },
          { name: "Расходы на детей", amount: 0 },
        ],
        total: 1620,
      },
      assets: [
          { name: "Сбережения", amount: 710 },
      ],
      liabilities: [
          { name: "Ипотека", amount: 38000 },
          { name: "Кредиты на машину", amount: 4000 },
          { name: "Кредитные карточки", amount: 2000 },
          { name: "Мелкие кредиты.1", amount: 1000 },
      ],
      monthlyCashFlow: 880,
    },
  },

  manager: {
    name: "Менеджер",
    financialData: {
      income: {
        items: [
          { name: "Зарплата", amount: 4600 },
          { name: "Проценты", amount: 0 },
          { name: "Дивиденды", amount: 0 },
          { name: "Недвиж. и предприятия", amount: 0 },
          { name: "Пассивный доход", amount: 0 },
        ],
        total: 4600,
      },
      expenses: {
        items: [
          { name: "Налоги", amount: 910 },
          { name: "Ипотека и аренд. плата", amount: 700 },
          { name: "Кредит на образование", amount: 60 },
          { name: "Кредит на машину", amount: 120 },
          { name: "Кредитная карточка", amount: 90 },
          { name: "Мелкие кредиты", amount: 50 },
          { name: "Прочие расходы", amount: 1000 },
          { name: "Расходы на детей", amount: 0 },
        ],
        total: 2930,
      },
      assets: [
          { name: "Сбережения", amount: 400 },
      ],
      liabilities: [
          { name: "Ипотека", amount: 75000 },
          { name: "Кредиты на образование", amount: 12000 },
          { name: "Кредиты на машину", amount: 6000 },
          { name: "Кредитные карточки", amount: 3000 },
          { name: "Мелкие кредиты.1", amount: 1000 },
      ],
      monthlyCashFlow: 1670,
    },
  },

  nurse: {
    name: "Медсестра",
    financialData: {
      income: {
        items: [
          { name: "Зарплата", amount: 3100 },
          { name: "Проценты", amount: 0 },
          { name: "Дивиденды", amount: 0 },
          { name: "Недвиж. и предприятия", amount: 0 },
          { name: "Пассивный доход", amount: 0 },
        ],
        total: 3100,
      },
      expenses: {
        items: [
          { name: "Налоги", amount: 600 },
          { name: "Ипотека и аренд. плата", amount: 400 },
          { name: "Кредит на образование", amount: 30 },
          { name: "Кредит на машину", amount: 90 },
          { name: "Кредитная карточка", amount: 90 },
          { name: "Мелкие кредиты", amount: 50 },
          { name: "Прочие расходы", amount: 720 },
          { name: "Расходы на детей", amount: 0 },
        ],
        total: 1980,
      },
      assets: [
          { name: "Сбережения", amount: 480 },
      ],
      liabilities: [
          { name: "Ипотека", amount: 47000 },
          { name: "Кредиты на образование", amount: 6000 },
          { name: "Кредиты на машину", amount: 5000 },
          { name: "Кредитные карточки", amount: 3000 },
          { name: "Мелкие кредиты.1", amount: 1000 },
      ],
      monthlyCashFlow: 1120,
    },
  },

  lawyer: {
    name: "Адвокат",
    financialData: {
      income: {
        items: [
          { name: "Зарплата", amount: 7500 },
          { name: "Проценты", amount: 0 },
          { name: "Дивиденды", amount: 0 },
          { name: "Недвиж. и предприятия", amount: 0 },
          { name: "Пассивный доход", amount: 0 },
        ],
        total: 7500,
      },
      expenses: {
        items: [
          { name: "Налоги", amount: 1830 },
          { name: "Ипотека и аренд. плата", amount: 1100 },
          { name: "Кредит на образование", amount: 390 },
          { name: "Кредит на машину", amount: 220 },
          { name: "Кредитная карточка", amount: 180 },
          { name: "Мелкие кредиты", amount: 50 },
          { name: "Прочие расходы", amount: 1650 },
          { name: "Расходы на детей", amount: 0 },
        ],
        total: 5420,
      },
      assets: [
          { name: "Сбережения", amount: 400 },
      ],
      liabilities: [
          { name: "Ипотека", amount: 115000 },
          { name: "Кредиты на образование", amount: 78000 },
          { name: "Кредиты на машину", amount: 11000 },
          { name: "Кредитные карточки", amount: 6000 },
          { name: "Мелкие кредиты.1", amount: 1000 },
      ],
      monthlyCashFlow: 2080,
    },
  },

  janitor: {
    name: "Дворник",
    financialData: {
      income: {
        items: [
          { name: "Зарплата", amount: 1600 },
          { name: "Проценты", amount: 0 },
          { name: "Дивиденды", amount: 0 },
          { name: "Недвиж. и предприятия", amount: 0 },
          { name: "Пассивный доход", amount: 0 },
        ],
        total: 1600,
      },
      expenses: {
        items: [
          { name: "Налоги", amount: 280 },
          { name: "Ипотека и аренд. плата", amount: 200 },
          { name: "Кредит на образование", amount: 0 },
          { name: "Кредит на машину", amount: 60 },
          { name: "Кредитная карточка", amount: 60 },
          { name: "Мелкие кредиты", amount: 50 },
          { name: "Прочие расходы", amount: 300 },
          { name: "Расходы на детей", amount: 0 },
        ],
        total: 950,
      },
      assets: [
          { name: "Сбережения", amount: 560 },
      ],
      liabilities: [
          { name: "Ипотека", amount: 20000 },
          { name: "Кредиты на машину", amount: 4000 },
          { name: "Кредитные карточки", amount: 2000 },
          { name: "Мелкие кредиты.1", amount: 1000 },
      ],
      monthlyCashFlow: 650,
    },
  },

  driver: {
    name: "Водитель грузовика",
    financialData: {
      income: {
        items: [
          { name: "Зарплата", amount: 2500 },
          { name: "Проценты", amount: 0 },
          { name: "Дивиденды", amount: 0 },
          { name: "Недвиж. и предприятия", amount: 0 },
          { name: "Пассивный доход", amount: 0 },
        ],
        total: 2500,
      },
      expenses: {
        items: [
          { name: "Налоги", amount: 460 },
          { name: "Ипотека и аренд. плата", amount: 400 },
          { name: "Кредит на образование", amount: 0 },
          { name: "Кредит на машину", amount: 80 },
          { name: "Кредитная карточка", amount: 60 },
          { name: "Мелкие кредиты", amount: 50 },
          { name: "Прочие расходы", amount: 570 },
          { name: "Расходы на детей", amount: 0 },
        ],
        total: 1620,
      },
      assets: [
          { name: "Сбережения", amount: 750 },
      ],
      liabilities: [
          { name: "Ипотека", amount: 38000 },
          { name: "Кредиты на образование", amount: 4000 },
          { name: "Кредиты на машину", amount: 2000 },
          { name: "Кредитные карточки", amount: 2000 },
          { name: "Мелкие кредиты.1", amount: 1000 },
      ],
      monthlyCashFlow: 880,
    },
  },

}

export const icons = import.meta.glob<{ default: string }>('/src/assets/roles/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})
