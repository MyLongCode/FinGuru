import type { Meta, StoryObj } from '@storybook/react'
import ProgressBar from '../components/ProgressBar'

const meta: Meta<typeof ProgressBar> = {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof ProgressBar>

export const Full: Story = {
  args: {
    bigCircleTarget: 10_401,
    passiveIncomeProgress: 10_401,
    bigCircleRemaining: 0,
  },
}

export const Partial: Story = {
  args: {
    bigCircleTarget: 25_001,
    passiveIncomeProgress: 8_400,
    bigCircleRemaining: 16_601,
  },
}

export const Empty: Story = {
  args: {
    bigCircleTarget: 10_401,
    passiveIncomeProgress: 0,
    bigCircleRemaining: 10_401,
  },
}
