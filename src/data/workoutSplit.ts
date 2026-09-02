export interface Exercise {
  name: string
  targetSets: number
  targetReps: string
  restSeconds: number
  primaryMuscles: string[]
  formCues: string[]
  homeVariant?: string
  swapOptions?: string[]
}

export interface WorkoutDay {
  day: number
  name: string
  shortName: string
  focus: string
  color: string
  exercises: Exercise[]
  focusTags: string[]
}

export const WORKOUT_SPLIT: WorkoutDay[] = [
  {
    day: 1,
    name: 'Push',
    shortName: 'Push',
    focus: 'Chest + Triceps',
    color: '#c05050',
    focusTags: ['chest stretch', 'tricep overload', 'pressing strength'],
    exercises: [
      { name: 'Bench Press', targetSets: 4, targetReps: '8–10', restSeconds: 120, primaryMuscles: ['Pectorals', 'Anterior delts', 'Triceps'], formCues: ['Retract and depress scapula', 'Bar path slightly diagonal', 'Leg drive into the floor', 'Touch lower chest'], homeVariant: 'Dumbbell Floor Press', swapOptions: ['Push-Ups', 'Incline Dumbbell Press'] },
      { name: 'Incline Dumbbell Press', targetSets: 3, targetReps: '10–12', restSeconds: 90, primaryMuscles: ['Upper pectorals', 'Anterior delts'], formCues: ['45° incline', 'Full stretch at bottom', 'Squeeze at top'], homeVariant: 'Decline Push-Ups', swapOptions: ['Flat Dumbbell Press'] },
      { name: 'Chest Fly', targetSets: 3, targetReps: '12–15', restSeconds: 60, primaryMuscles: ['Pectorals'], formCues: ['Slight bend in elbows', 'Wide arc motion', 'Feel the stretch'], homeVariant: 'Resistance Band Fly', swapOptions: ['Dumbbell Fly'] },
      { name: 'Shoulder Press', targetSets: 3, targetReps: '10', restSeconds: 90, primaryMuscles: ['Deltoids', 'Triceps'], formCues: ['Neutral spine', 'Full lockout at top'], homeVariant: 'Dumbbell Overhead Press', swapOptions: ['Pike Push-Ups'] },
      { name: 'Tricep Pushdowns', targetSets: 4, targetReps: '12', restSeconds: 60, primaryMuscles: ['Triceps'], formCues: ['Elbows pinned to sides', 'Full extension'], homeVariant: 'Band Tricep Extension', swapOptions: ['Bench Dips'] },
      { name: 'Overhead Tricep Extension', targetSets: 3, targetReps: '12', restSeconds: 60, primaryMuscles: ['Long head tricep'], formCues: ['Keep elbows forward', 'Full stretch overhead'], homeVariant: 'Dumbbell Overhead Extension', swapOptions: ['Diamond Push-Ups'] },
      { name: 'Tricep Dips', targetSets: 3, targetReps: 'failure', restSeconds: 60, primaryMuscles: ['Triceps', 'Chest'], formCues: ['Lean forward for chest', 'Upright for triceps'], homeVariant: 'Chair Dips', swapOptions: ['Bodyweight Dips'] },
    ],
  },
  {
    day: 2,
    name: 'Pull',
    shortName: 'Pull',
    focus: 'Back Width + Rear Delts',
    color: '#378ADD',
    focusTags: ['lat width', 'posture', 'upper back'],
    exercises: [
      { name: 'Pull Ups', targetSets: 4, targetReps: 'max', restSeconds: 120, primaryMuscles: ['Lats', 'Biceps'], formCues: ['Dead hang start', 'Drive elbows to hips', 'Full ROM'], homeVariant: 'Doorframe Towel Rows', swapOptions: ['Inverted Rows'] },
      { name: 'Barbell Rows', targetSets: 4, targetReps: '8–10', restSeconds: 90, primaryMuscles: ['Mid back', 'Lats', 'Biceps'], formCues: ['Hinge at hips', 'Pull to lower chest', 'Squeeze shoulder blades'], homeVariant: 'Dumbbell Bent-Over Row', swapOptions: ['Single-Arm Dumbbell Row'] },
      { name: 'Seated Rows', targetSets: 3, targetReps: '10–12', restSeconds: 90, primaryMuscles: ['Mid back', 'Rhomboids'], formCues: ['Chest up', 'Full stretch forward'], homeVariant: 'Resistance Band Seated Row', swapOptions: ['Dumbbell Row'] },
      { name: 'Face Pulls', targetSets: 3, targetReps: '15–20', restSeconds: 60, primaryMuscles: ['Rear delts', 'Rotator cuff'], formCues: ['Pull to face level', 'External rotation at end'], homeVariant: 'Band Face Pulls', swapOptions: ['Rear Delt Dumbbell Fly'] },
      { name: 'Lat Pulldowns', targetSets: 3, targetReps: '10–12', restSeconds: 90, primaryMuscles: ['Lats'], formCues: ['Lean back slightly', 'Drive elbows down'], homeVariant: 'Band Overhead Pulldown', swapOptions: ['Chin-Ups'] },
    ],
  },
  {
    day: 3,
    name: 'Legs + Abs',
    shortName: 'Legs',
    focus: 'Quad + Hamstring + Core',
    color: '#4a9a44',
    focusTags: ['lower body strength', 'posterior chain', 'core stability'],
    exercises: [
      { name: 'Squats', targetSets: 4, targetReps: '6–8', restSeconds: 180, primaryMuscles: ['Quads', 'Glutes', 'Hamstrings'], formCues: ['Brace core hard', 'Knees track toes', 'Break parallel'], homeVariant: 'Goblet Squat', swapOptions: ['Bulgarian Split Squat', 'Bodyweight Squat'] },
      { name: 'Romanian Deadlifts', targetSets: 3, targetReps: '10', restSeconds: 120, primaryMuscles: ['Hamstrings', 'Glutes'], formCues: ['Hinge at hips', 'Bar stays close', 'Feel hamstring stretch'], homeVariant: 'Dumbbell RDL', swapOptions: ['Single-Leg Dumbbell RDL'] },
      { name: 'Leg Press', targetSets: 3, targetReps: '12', restSeconds: 90, primaryMuscles: ['Quads', 'Glutes'], formCues: ['Feet shoulder width', 'Full depth'], homeVariant: 'Bulgarian Split Squats', swapOptions: ['Dumbbell Step-Ups'] },
      { name: 'Hamstring Curls', targetSets: 3, targetReps: '12–15', restSeconds: 60, primaryMuscles: ['Hamstrings'], formCues: ['Slow eccentric', 'Full contraction'], homeVariant: 'Dumbbell Lying Hamstring Curl', swapOptions: ['Glute Bridge Slider'] },
      { name: 'Calf Raises', targetSets: 4, targetReps: '15–20', restSeconds: 45, primaryMuscles: ['Calves'], formCues: ['Full stretch at bottom', 'Pause at top'], homeVariant: 'Single-Leg Bodyweight Calf Raise', swapOptions: ['Dumbbell Calf Raise'] },
      { name: 'Hanging Leg Raises', targetSets: 3, targetReps: '12–15', restSeconds: 60, primaryMuscles: ['Lower abs'], formCues: ['No swinging', 'Control the descent'], homeVariant: 'Lying Leg Raises', swapOptions: ['Reverse Crunches'] },
      { name: 'Cable Crunches', targetSets: 3, targetReps: '15', restSeconds: 60, primaryMuscles: ['Upper abs'], formCues: ['Curl spine, not hips'], homeVariant: 'Band Crunches', swapOptions: ['Floor Crunches'] },
      { name: 'Planks', targetSets: 3, targetReps: '60s', restSeconds: 45, primaryMuscles: ['Core', 'Transverse abdominis'], formCues: ['Squeeze everything', 'Breathe'], homeVariant: 'Planks', swapOptions: ['Side Planks'] },
    ],
  },
  {
    day: 4,
    name: 'Push 2.0',
    shortName: 'Push 2',
    focus: 'Shoulder Dominant',
    color: '#c9a040',
    focusTags: ['shoulder mass', 'upper chest', 'deltoid definition'],
    exercises: [
      { name: 'Incline Bench Press', targetSets: 4, targetReps: '8–10', restSeconds: 120, primaryMuscles: ['Upper chest', 'Anterior delts'], formCues: ['45° incline', 'Control the descent'], homeVariant: 'Decline Push-Ups', swapOptions: ['Incline Dumbbell Press'] },
      { name: 'Overhead Press', targetSets: 4, targetReps: '6–8', restSeconds: 120, primaryMuscles: ['Deltoids', 'Triceps'], formCues: ['Bar in front', 'Full lockout'], homeVariant: 'Dumbbell Shoulder Press', swapOptions: ['Pike Push-Ups'] },
      { name: 'Dumbbell Shoulder Press', targetSets: 3, targetReps: '10–12', restSeconds: 90, primaryMuscles: ['Deltoids'], formCues: ['Neutral grip option', 'Controlled descent'], homeVariant: 'Seated Dumbbell Press', swapOptions: ['Pike Push-Ups'] },
      { name: 'Lateral Raises', targetSets: 4, targetReps: '15', restSeconds: 45, primaryMuscles: ['Lateral deltoids'], formCues: ['Slight forward lean', 'Lead with elbows', 'Slow eccentric'], homeVariant: 'Dumbbell Lateral Raises', swapOptions: ['Band Lateral Raises'] },
      { name: 'Rear Delt Fly', targetSets: 3, targetReps: '15', restSeconds: 45, primaryMuscles: ['Rear deltoids'], formCues: ['Hinge forward', 'Wide arc'], homeVariant: 'Bent-Over Dumbbell Rear Delt Fly', swapOptions: ['Band Pull-Aparts'] },
      { name: 'Skull Crushers', targetSets: 3, targetReps: '10–12', restSeconds: 60, primaryMuscles: ['Triceps'], formCues: ['Lower to forehead level', 'Control'], homeVariant: 'Dumbbell Skull Crushers', swapOptions: ['Bodyweight Extensions'] },
      { name: 'Dips', targetSets: 3, targetReps: 'failure', restSeconds: 60, primaryMuscles: ['Triceps', 'Chest'], formCues: ['Full depth', 'Upright torso'], homeVariant: 'Chair Dips', swapOptions: ['Bench Dips'] },
    ],
  },
  {
    day: 5,
    name: 'Pull 2.0',
    shortName: 'Pull 2',
    focus: 'Back Thickness',
    color: '#7060c0',
    focusTags: ['mid-back density', 'spinal erectors', 'bicep stretch'],
    exercises: [
      { name: 'Barbell Rows', targetSets: 4, targetReps: '6–8', restSeconds: 120, primaryMuscles: ['Mid back', 'Lats'], formCues: ['Heavy this session', 'Strict form'], homeVariant: 'Dumbbell Bent-Over Row', swapOptions: ['Single-Arm Dumbbell Row'] },
      { name: 'T-Bar Rows', targetSets: 3, targetReps: '10', restSeconds: 90, primaryMuscles: ['Mid back', 'Thickness'], formCues: ['Squeeze at top', 'Full stretch'], homeVariant: 'Single-Arm Dumbbell Row', swapOptions: ['Band Rows'] },
      { name: 'Chest Supported Rows', targetSets: 3, targetReps: '12', restSeconds: 90, primaryMuscles: ['Mid back'], formCues: ['Chest on pad', 'No momentum'], homeVariant: 'Prone Dumbbell Row', swapOptions: ['Band Row'] },
      { name: 'Close Grip Pulldown', targetSets: 3, targetReps: '12', restSeconds: 90, primaryMuscles: ['Lats', 'Biceps'], formCues: ['Pull to upper chest', 'Elbows tucked'], homeVariant: 'Band Neutral Pulldown', swapOptions: ['Chin-Ups'] },
      { name: 'Deadlifts', targetSets: 3, targetReps: '5', restSeconds: 180, primaryMuscles: ['Entire posterior chain'], formCues: ['Brace hard', 'Bar over mid foot', 'Drive floor away'], homeVariant: 'Heavy Dumbbell RDL', swapOptions: ['Single-Leg Dumbbell Deadlift'] },
      { name: 'Incline Dumbbell Curls', targetSets: 3, targetReps: '10–12', restSeconds: 60, primaryMuscles: ['Biceps long head'], formCues: ['Full stretch at bottom', 'Slow eccentric'], homeVariant: 'Seated Dumbbell Curls', swapOptions: ['Band Bicep Curls'] },
      { name: 'Face Pulls', targetSets: 3, targetReps: '20', restSeconds: 45, primaryMuscles: ['Rear delts', 'Rotator cuff'], formCues: ['Shoulder health first'], homeVariant: 'Band Face Pulls', swapOptions: ['Rear Delt Fly'] },
    ],
  },
  {
    day: 6,
    name: 'Legs + Shoulders 2.0',
    shortName: 'Legs 2',
    focus: 'Unilateral + Traps',
    color: '#555',
    focusTags: ['unilateral strength', 'shoulder detail', 'trap development'],
    exercises: [
      { name: 'Front Squats', targetSets: 4, targetReps: '6–8', restSeconds: 150, primaryMuscles: ['Quads', 'Core'], formCues: ['Elbows high', 'Upright torso', 'Deep squat'], homeVariant: 'Dumbbell Front Squat', swapOptions: ['Goblet Squat'] },
      { name: 'Bulgarian Split Squats', targetSets: 3, targetReps: '10 each', restSeconds: 90, primaryMuscles: ['Quads', 'Glutes'], formCues: ['Rear foot elevated', 'Front knee tracks toe'], homeVariant: 'Dumbbell Split Squat', swapOptions: ['Bodyweight Split Squat'] },
      { name: 'Leg Extensions', targetSets: 3, targetReps: '15', restSeconds: 60, primaryMuscles: ['Quads'], formCues: ['Full extension', 'Squeeze at top'], homeVariant: 'Band Leg Extensions', swapOptions: ['Bodyweight Sissy Squat'] },
      { name: 'Hamstring Curls', targetSets: 3, targetReps: '12–15', restSeconds: 60, primaryMuscles: ['Hamstrings'], formCues: ['Slow eccentric'], homeVariant: 'Dumbbell Lying Hamstring Curl', swapOptions: ['Band Hamstring Curl'] },
      { name: 'Calf Raises', targetSets: 4, targetReps: '20', restSeconds: 45, primaryMuscles: ['Calves'], formCues: ['Single leg option for intensity'], homeVariant: 'Single-Leg Bodyweight Calf Raise', swapOptions: ['Dumbbell Calf Raise'] },
      { name: 'Lateral Raises', targetSets: 4, targetReps: '15', restSeconds: 45, primaryMuscles: ['Lateral delts'], formCues: ['Controlled throughout'], homeVariant: 'Dumbbell Lateral Raises', swapOptions: ['Band Lateral Raises'] },
      { name: 'Rear Delt Fly', targetSets: 3, targetReps: '15', restSeconds: 45, primaryMuscles: ['Rear delts'], formCues: ['Cable or dumbbell'], homeVariant: 'Bent-Over Dumbbell Rear Delt Fly', swapOptions: ['Band Pull-Aparts'] },
      { name: 'Shrugs', targetSets: 4, targetReps: '15', restSeconds: 60, primaryMuscles: ['Traps'], formCues: ['Full shrug up', 'Hold 1s at top'], homeVariant: 'Dumbbell Shrugs', swapOptions: ['Band Shrugs'] },
    ],
  },
  {
    day: 7,
    name: 'Recovery',
    shortName: 'Rest',
    focus: 'Rest + Stretch + Hydrate',
    color: '#333',
    focusTags: ['sleep', 'hydration', 'mobility'],
    exercises: [],
  },
]

export const STRETCH_ROUTINE = [
  { name: 'Hip flexor stretch', duration: '60s each side' },
  { name: 'Thoracic rotation', duration: '10 reps' },
  { name: 'Hamstring foam roll', duration: '2 min' },
  { name: 'Shoulder cross-body stretch', duration: '30s each' },
  { name: 'Child\'s pose', duration: '60s' },
  { name: 'Pigeon pose', duration: '60s each side' },
]
