import { v4 as uuidv4 } from 'uuid';

export const generateSeedData = () => {
  const contestId = uuidv4();
  const startDate = new Date().toISOString();
  
  // Create default contest
  const contests = [{
    id: contestId,
    name: 'Kaizen Competition 2026',
    code: 'KC2026',
    startDate,
    days: 2,
    hallCount: 10,
    deletedHalls: [],
    status: 'active'
  }];

  // Generate 20 juries (2 per hall)
  const juries = [];
  for (let hall = 1; hall <= 10; hall++) {
    for (let j = 1; j <= 2; j++) {
      juries.push({
        id: uuidv4(),
        name: `Jury H${hall}-${j}`,
        username: `jury_h${hall}_${j}`,
        password: `jury${hall}${j}password`, // In production, this should be hashed
        isDeleted: false,
        role: 'jury',
        mustChangePassword: true
      });
    }
  }

  // Generate 200 teams (20 per hall, 10 on day 1, 10 on day 2)
  const teams = [];
  let teamCounter = 1;
  for (let hall = 1; hall <= 10; hall++) {
    for (let day = 1; day <= 2; day++) {
      for (let t = 1; t <= 10; t++) {
        teams.push({
          id: uuidv4(),
          contestId,
          teamCode: `T${String(hall).padStart(2, '0')}D${day}${String(t).padStart(2, '0')}`,
          teamName: `Team Hall${hall} Day${day} #${t}`,
          organisationName: `Organisation Hall${hall} Day${day} #${t}`,
          category: t % 2 === 0 ? 'School' : 'College',
          assignedDay: day,
          hallId: hall,
          isDeleted: false
        });
        teamCounter++;
      }
    }
  }

  // Generate hall assignments (2 juries per hall/day)
  const hall_assignments = [];
  const juryMap = new Map(); // Map hall -> juries
  
  juries.forEach(jury => {
    // Extract hall number from username
    const match = jury.username.match(/h(\d+)/);
    if (match) {
      const hall = parseInt(match[1]);
      if (!juryMap.has(hall)) {
        juryMap.set(hall, []);
      }
      juryMap.get(hall).push(jury.id);
    }
  });

  for (let day = 1; day <= 2; day++) {
    for (let hall = 1; hall <= 10; hall++) {
      const hallJuries = juryMap.get(hall) || [];
      hall_assignments.push({
        id: `${contestId}-D${day}-H${hall}`,
        contestId,
        day,
        hallId: hall,
        juryIds: hallJuries.slice(0, 2) // Take first 2 juries
      });
    }
  }

  // Empty evaluations and state
  const evaluations = {};
  const state = {
    activeContestId: contestId,
    timestamp: new Date().toISOString()
  };

  return {
    contests,
    juries,
    teams,
    hall_assignments,
    evaluations,
    state
  };
};
