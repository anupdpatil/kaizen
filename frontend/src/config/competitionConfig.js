import { CATEGORY_WISE_EVALUATION_CRITERIA } from "../constants/categoryWiseEvaluationCriteria.js";
import { TEAM_CATEGORIES } from "../constants/teamCategories.js";

export const DEFAULT_COMPETITION_CONFIG = Object.freeze({
  categories: { ...TEAM_CATEGORIES },
  criteria: Object.fromEntries(
    Object.entries(CATEGORY_WISE_EVALUATION_CRITERIA).map(([group, criteria]) => [
      group,
      criteria.map((item) => ({ ...item })),
    ]),
  ),
});

export function getCompetitionConfig(appState = {}) {
  const configured = appState.state?.appConfig?.competition || {};
  return {
    categories: {
      ...DEFAULT_COMPETITION_CONFIG.categories,
      ...(configured.categories || {}),
    },
    criteria: {
      ...DEFAULT_COMPETITION_CONFIG.criteria,
      ...(configured.criteria || {}),
    },
  };
}

export function getCriteriaForTeam(appState, category) {
  const config = getCompetitionConfig(appState);
  const group = config.categories[category] || category;
  return config.criteria[group] || config.criteria["Allied Case Study"] || [];
}
