import type { Meta, StoryObj } from '@storybook/react'
import RoleDetailsPage from '../pages/RoleDetailsPage'
import { icons, roleData } from '../data/roles'

const meta: Meta<typeof RoleDetailsPage> = {
  title: 'Pages/RoleDetailsPage',
  component: RoleDetailsPage,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof RoleDetailsPage>

export const PoliceOfficer: Story = {
  args: {
    icon: icons['/src/assets/roles/policeOfficer.svg'] ?? '',
    roleName: roleData.policeOfficer.name,
    financialData: roleData.policeOfficer.financialData,
    onStartGame: () => alert('Игра началась!'),
  },
}

export const Doctor: Story = {
  args: {
    icon: icons['/src/assets/roles/doctor.svg'] ?? '',
    roleName: roleData.doctor.name,
    financialData: roleData.doctor.financialData,
    onStartGame: () => alert('Игра началась!'),
  },
}

export const AirlinePilot: Story = {
  args: {
    icon: icons['/src/assets/roles/airlinePilot.svg'] ?? '',
    roleName: roleData.airlinePilot.name,
    financialData: roleData.airlinePilot.financialData,
    onStartGame: () => alert('Игра началась!'),
  },
}

export const Janitor: Story = {
  args: {
    icon: icons['/src/assets/roles/janitor.svg'] ?? '',
    roleName: roleData.janitor.name,
    financialData: roleData.janitor.financialData,
    onStartGame: () => alert('Игра началась!'),
  },
}
