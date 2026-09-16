import { useOnboarding } from '../hooks/useOnboarding'
import { SectionWelcome } from '../components/onboarding/SectionWelcome'
import { ONBOARDING_CONFIGS } from '../lib/onboardingConfig'

export default function Skills() {
  const { showWelcome, completeWelcome } = useOnboarding('skills')

  return (
    <>
      {showWelcome && <SectionWelcome config={ONBOARDING_CONFIGS.skills} onComplete={completeWelcome} />}
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Skills</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium">
          Add Skill
        </button>
      </div>
      <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
        Skills section coming soon... Keep learning!
      </div>
    </div>
    </>
  )
}
