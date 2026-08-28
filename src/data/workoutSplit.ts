export interface Exercise {
  name: string
  targetSets: number
  targetReps: string
  restSeconds: number
  primaryMuscles: string[]
  formCues: string[]
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
      { name: 'Bench Press', targetSets: 4, targetReps: '8–10', restSeconds: 120, primaryMuscles: ['Pectorals', 'Anterior delts', 'Triceps'], formCues: ['Retract and depress scapula', 'Bar path slightly diagonal', 'Leg drive into the floor', 'Touch lower chest'] },
      { name: 'Incline Dumbbell Press', targetSets: 3, targetReps: '10–12', restSeconds: 90, primaryMuscles: ['Upper pectorals', 'Anterior delts'], formCues: ['45° incline', 'Full stretch at bottom', 'Squeeze at top'] },
      { name: 'Chest Fly', targetSets: 3, targetReps: '12–15', restSeconds: 60, primaryMuscles: ['Pectorals'], formCues: ['Slight bend in elbows', 'Wide arc motion', 'Feel the stretch'] },
      { name: 'Shoulder Press', targetSets: 3, targetReps: '10', restSeconds: 90, primaryMuscles: ['Deltoids', 'Triceps'], formCues: ['Neutral spine', 'Full lockout at top'] },
      { name: 'Tricep Pushdowns', targetSets: 4, targetReps: '12', restSeconds: 60, primaryMuscles: ['Triceps'], formCues: ['Elbows pinned to sides', 'Full extension'] },
      { name: 'Overhead Tricep Extension', targetSets: 3, targetReps: '12', restSeconds: 60, primaryMuscles: ['Long head tricep'], formCues: ['Keep elbows forward', 'Full stretch overhead'] },
      { name: 'Tricep Dips', targetSets: 3, targetReps: 'failure', restSeconds: 60, primaryMuscles: ['Triceps', 'Chest'], formCues: ['Lean forward for chest', 'Upright for triceps'] },
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
      { name: 'Pull Ups', targetSets: 4, targetReps: 'max', restSeconds: 120, primaryMuscles: ['Lats', 'Biceps'], formCues: ['Dead hang start', 'Drive elbows to hips', 'Full ROM'] },
      { name: 'Barbell Rows', targetSets: 4, targetReps: '8–10', restSeconds: 90, primaryMuscles: ['Mid back', 'Lats', 'Biceps'], formCues: ['Hinge at hips', 'Pull to lower chest', 'Squeeze shoulder blades'] },
      { name: 'Seated Rows', targetSets: 3, targetReps: '10–12', restSeconds: 90, primaryMuscles: ['Mid back', 'Rhomboids'], formCues: ['Chest up', 'Full stretch forward'] },
      { name: 'Face Pulls', targetSets: 3, targetReps: '15–20', restSeconds: 60, primaryMuscles: ['Rear delts', 'Rotator cuff'], formCues: ['Pull to face level', 'External rotation at end'] },
      { name: 'Lat Pulldowns', targetSets: 3, targetReps: '10–12', restSeconds: 90, primaryMuscles: ['Lats'], formCues: ['Lean back slightly', 'Drive elbows down'] },
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
      { name: 'Squats', targetSets: 4, targetReps: '6–8', restSeconds: 180, primaryMuscles: ['Quads', 'Glutes', 'Hamstrings'], formCues: ['Brace core hard', 'Knees track toes', 'Break parallel'] },
      { name: 'Romanian Deadlifts', targetSets: 3, targetReps: '10', restSeconds: 120, primaryMuscles: ['Hamstrings', 'Glutes'], formCues: ['Hinge at hips', 'Bar stays close', 'Feel hamstring stretch'] },
      { name: 'Leg Press', targetSets: 3, targetReps: '12', restSeconds: 90, primaryMuscles: ['Quads', 'Glutes'], formCues: ['Feet shoulder width', 'Full depth'] },
      { name: 'Hamstring Curls', targetSets: 3, targetReps: '12–15', restSeconds: 60, primaryMuscles: ['Hamstrings'], formCues: ['Slow eccentric', 'Full contraction'] },
      { name: 'Calf Raises', targetSets: 4, targetReps: '15–20', restSeconds: 45, primaryMuscles: ['Calves'], formCues: ['Full stretch at bottom', 'Pause at top'] },
      { name: 'Hanging Leg Raises', targetSets: 3, targetReps: '12–15', restSeconds: 60, primaryMuscles: ['Lower abs'], formCues: ['No swinging', 'Control the descent'] },
      { name: 'Cable Crunches', targetSets: 3, targetReps: '15', restSeconds: 60, primaryMuscles: ['Upper abs'], formCues: ['Curl spine, not hips'] },
      { name: 'Planks', targetSets: 3, targetReps: '60s', restSeconds: 45, primaryMuscles: ['Core', 'Transverse abdominis'], formCues: ['Squeeze everything', 'Breathe'] },
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
      { name: 'Incline Bench Press', targetSets: 4, targetReps: '8–10', restSeconds: 120, primaryMuscles: ['Upper chest', 'Anterior delts'], formCues: ['45° incline', 'Control the descent'] },
      { name: 'Overhead Press', targetSets: 4, targetReps: '6–8', restSeconds: 120, primaryMuscles: ['Deltoids', 'Triceps'], formCues: ['Bar in front', 'Full lockout'] },
      { name: 'Dumbbell Shoulder Press', targetSets: 3, targetReps: '10–12', restSeconds: 90, primaryMuscles: ['Deltoids'], formCues: ['Neutral grip option', 'Controlled descent'] },
      { name: 'Lateral Raises', targetSets: 4, targetReps: '15', restSeconds: 45, primaryMuscles: ['Lateral deltoids'], formCues: ['Slight forward lean', 'Lead with elbows', 'Slow eccentric'] },
      { name: 'Rear Delt Fly', targetSets: 3, targetReps: '15', restSeconds: 45, primaryMuscles: ['Rear deltoids'], formCues: ['Hinge forward', 'Wide arc'] },
      { name: 'Skull Crushers', targetSets: 3, targetReps: '10–12', restSeconds: 60, primaryMuscles: ['Triceps'], formCues: ['Lower to forehead level', 'Control'] },
      { name: 'Dips', targetSets: 3, targetReps: 'failure', restSeconds: 60, primaryMuscles: ['Triceps', 'Chest'], formCues: ['Full depth', 'Upright torso'] },
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
      { name: 'Barbell Rows', targetSets: 4, targetReps: '6–8', restSeconds: 120, primaryMuscles: ['Mid back', 'Lats'], formCues: ['Heavy this session', 'Strict form'] },
      { name: 'T-Bar Rows', targetSets: 3, targetReps: '10', restSeconds: 90, primaryMuscles: ['Mid back', 'Thickness'], formCues: ['Squeeze at top', 'Full stretch'] },
      { name: 'Chest Supported Rows', targetSets: 3, targetReps: '12', restSeconds: 90, primaryMuscles: ['Mid back'], formCues: ['Chest on pad', 'No momentum'] },
      { name: 'Close Grip Pulldown', targetSets: 3, targetReps: '12', restSeconds: 90, primaryMuscles: ['Lats', 'Biceps'], formCues: ['Pull to upper chest', 'Elbows tucked'] },
      { name: 'Deadlifts', targetSets: 3, targetReps: '5', restSeconds: 180, primaryMuscles: ['Entire posterior chain'], formCues: ['Brace hard', 'Bar over mid foot', 'Drive floor away'] },
      { name: 'Incline Dumbbell Curls', targetSets: 3, targetReps: '10–12', restSeconds: 60, primaryMuscles: ['Biceps long head'], formCues: ['Full stretch at bottom', 'Slow eccentric'] },
      { name: 'Face Pulls', targetSets: 3, targetReps: '20', restSeconds: 45, primaryMuscles: ['Rear delts', 'Rotator cuff'], formCues: ['Shoulder health first'] },
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
      { name: 'Front Squats', targetSets: 4, targetReps: '6–8', restSeconds: 150, primaryMuscles: ['Quads', 'Core'], formCues: ['Elbows high', 'Upright torso', 'Deep squat'] },
      { name: 'Bulgarian Split Squats', targetSets: 3, targetReps: '10 each', restSeconds: 90, primaryMuscles: ['Quads', 'Glutes'], formCues: ['Rear foot elevated', 'Front knee tracks toe'] },
      { name: 'Leg Extensions', targetSets: 3, targetReps: '15', restSeconds: 60, primaryMuscles: ['Quads'], formCues: ['Full extension', 'Squeeze at top'] },
      { name: 'Hamstring Curls', targetSets: 3, targetReps: '12–15', restSeconds: 60, primaryMuscles: ['Hamstrings'], formCues: ['Slow eccentric'] },
      { name: 'Calf Raises', targetSets: 4, targetReps: '20', restSeconds: 45, primaryMuscles: ['Calves'], formCues: ['Single leg option for intensity'] },
      { name: 'Lateral Raises', targetSets: 4, targetReps: '15', restSeconds: 45, primaryMuscles: ['Lateral delts'], formCues: ['Controlled throughout'] },
      { name: 'Rear Delt Fly', targetSets: 3, targetReps: '15', restSeconds: 45, primaryMuscles: ['Rear delts'], formCues: ['Cable or dumbbell'] },
      { name: 'Shrugs', targetSets: 4, targetReps: '15', restSeconds: 60, primaryMuscles: ['Traps'], formCues: ['Full shrug up', 'Hold 1s at top'] },
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
