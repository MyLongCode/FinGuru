import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RoleCardPage from '../pages/RoleCardPage'

function RoleCardPageStory({ roleName }: { roleName: string }) {
  return (
    <MemoryRouter initialEntries={[`/role/${roleName}`]}>
      <Routes>
        <Route path="/role/:roleName" element={<RoleCardPage onTimeout={() => {}} />} />
      </Routes>
    </MemoryRouter>
  )
}

const meta: Meta<typeof RoleCardPageStory> = {
  title: 'Pages/RoleCardPage',
  component: RoleCardPageStory,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    roleName: {
      control: 'select',
      options: [
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
      ],
    },
  },
}

export default meta
type Story = StoryObj<typeof RoleCardPageStory>

export const PoliceOfficer: Story = {
  args: { roleName: 'policeOfficer' },
}

export const Doctor: Story = {
  args: { roleName: 'doctor' },
}

export const AirlinePilot: Story = {
  args: { roleName: 'airlinePilot' },
}

export const Janitor: Story = {
  args: { roleName: 'janitor' },
}
