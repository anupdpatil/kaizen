import { useEffect, useState } from "react";
import { stateAPI } from "../../utils/api.js";
import { APP_CONFIG } from "../../config/appConfig.js";
import {
  getCompetitionConfig,
} from "../../config/competitionConfig.js";
import { showToast } from "../../utils/notify.js";

const brandingFields = [
  ["appName", "Application name", "Shown in the application header and login page."],
  ["tagline", "Tagline", "Shown below the application name."],
  ["browserTitle", "Browser title", "Shown in the browser tab."],
  ["loadingMessage", "Loading message", "Shown while the application is starting."],
  ["organizationName", "Organization name", "Used for organization/publisher branding."],
];

const terminologyFields = [
  ["contest", "Contest label"],
  ["team", "Team label"],
  ["jury", "Jury label"],
];

const createFormData = (appConfig) => ({
  ...APP_CONFIG,
  ...appConfig,
  terminology: { ...APP_CONFIG.terminology, ...(appConfig.terminology || {}) },
  competition: getCompetitionConfig({ state: { appConfig } }),
});

function ConfigurationPage({ appConfig = APP_CONFIG, onConfigChange = () => {} }) {
  const [formData, setFormData] = useState(() => createFormData(appConfig));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(
    () => Object.keys(createFormData(appConfig).competition.criteria)[0] || "",
  );

  const updateField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const updateCompetition = (nextCompetition) => {
    setFormData((current) => ({ ...current, competition: nextCompetition }));
  };

  const updateCategory = (category, field, value) => {
    const categories = { ...formData.competition.categories };
    if (field === "name") {
      const nextCategories = Object.fromEntries(
        Object.entries(categories).map(([key, group]) => [
          key === category ? value : key,
          group,
        ]),
      );
      updateCompetition({ ...formData.competition, categories: nextCategories });
      return;
    }
    categories[category] = value;
    updateCompetition({ ...formData.competition, categories });
  };

  const removeCategory = (category) => {
    const categories = { ...formData.competition.categories };
    delete categories[category];
    updateCompetition({ ...formData.competition, categories });
  };

  const addCategory = () => {
    let name = "New Category";
    let index = 2;
    while (formData.competition.categories[name]) {
      name = `New Category ${index}`;
      index += 1;
    }
    updateCategory(name, "group", Object.keys(formData.competition.criteria)[0] || "Allied Case Study");
  };

  const updateCriteriaGroupName = (group, value) => {
    const criteria = { ...formData.competition.criteria };
    const nextCriteria = Object.fromEntries(
      Object.entries(criteria).map(([key, items]) => [key === group ? value : key, items]),
    );
    const categories = Object.fromEntries(
      Object.entries(formData.competition.categories).map(([category, mappedGroup]) => [
        category,
        mappedGroup === group ? value : mappedGroup,
      ]),
    );
    updateCompetition({ criteria: nextCriteria, categories });
    setSelectedGroup(value);
  };

  const updateCriterion = (group, index, field, value) => {
    const criteria = {
      ...formData.competition.criteria,
      [group]: formData.competition.criteria[group].map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: field === "weightage" ? Number(value) : value }
          : item,
      ),
    };
    updateCompetition({ ...formData.competition, criteria });
  };

  const removeCriterion = (group, index) => {
    const criteria = {
      ...formData.competition.criteria,
      [group]: formData.competition.criteria[group].filter((_, itemIndex) => itemIndex !== index),
    };
    updateCompetition({ ...formData.competition, criteria });
  };

  const addCriterion = (group) => {
    const criteria = {
      ...formData.competition.criteria,
      [group]: [
        ...formData.competition.criteria[group],
        { criterion: "New criterion", weightage: 5 },
      ],
    };
    updateCompetition({ ...formData.competition, criteria });
  };

  const addCriteriaGroup = () => {
    let name = "New Evaluation Group";
    let index = 2;
    while (formData.competition.criteria[name]) {
      name = `New Evaluation Group ${index}`;
      index += 1;
    }
    updateCompetition({
      ...formData.competition,
      criteria: { ...formData.competition.criteria, [name]: [] },
    });
    setSelectedGroup(name);
  };

  const removeCriteriaGroup = (group) => {
    const criteria = { ...formData.competition.criteria };
    delete criteria[group];
    const fallbackGroup = Object.keys(criteria)[0];
    const categories = Object.fromEntries(
      Object.entries(formData.competition.categories).map(([category, mappedGroup]) => [
        category,
        mappedGroup === group ? fallbackGroup : mappedGroup,
      ]),
    );
    updateCompetition({ criteria, categories });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await stateAPI.updateConfig(formData);
      onConfigChange(response.data);
      showToast("Application configuration saved", "success");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to save application configuration.");
    } finally {
      setSaving(false);
    }
  };

  const criteriaGroups = Object.entries(formData.competition.criteria);
  const activeCriteria = formData.competition.criteria[selectedGroup] || [];

  useEffect(() => {
    if (!formData.competition.criteria[selectedGroup]) {
      setSelectedGroup(criteriaGroups[0]?.[0] || "");
    }
  }, [criteriaGroups, formData.competition.criteria, selectedGroup]);

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
      <div className="card">
        <h2>Application Configuration</h2>
        <p className="text-muted">
          Manage client branding, terminology, and competition rules from one place.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
      </div>

      <section className="card">
        <h3>Branding</h3>
        {brandingFields.map(([name, label, description]) => (
          <div className="form-group" key={name}>
            <label className="required" htmlFor={`config-${name}`}>{label}</label>
            <input
              id={`config-${name}`}
              type="text"
              maxLength="160"
              value={formData[name] || ""}
              onChange={(event) => updateField(name, event.target.value)}
              required
              disabled={saving}
            />
            <small style={{ color: "var(--text-secondary)" }}>{description}</small>
          </div>
        ))}
      </section>

      <section className="card">
        <h3>Terminology</h3>
        <p className="text-muted">Customize the words used for core competition entities.</p>
        {terminologyFields.map(([name, label]) => (
          <div className="form-group" key={name}>
            <label className="required" htmlFor={`term-${name}`}>{label}</label>
            <input
              id={`term-${name}`}
              type="text"
              maxLength="60"
              value={formData.terminology[name] || ""}
              onChange={(event) => updateField("terminology", {
                ...formData.terminology,
                [name]: event.target.value,
              })}
              required
              disabled={saving}
            />
          </div>
        ))}
      </section>

      <section className="card">
        <h3>Competition Rules</h3>
        <p className="text-muted">
          Add categories and connect each one to an evaluation group.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addCategory}>Add category</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <caption className="sr-only">Competition categories and their evaluation groups</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Evaluation group</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(formData.competition.categories).map(([category, group]) => (
                <tr key={category}>
                  <td>
                    <label className="sr-only" htmlFor={`category-${category}`}>Category name</label>
                    <input id={`category-${category}`} value={category} onChange={(event) => updateCategory(category, "name", event.target.value)} disabled={saving} />
                  </td>
                  <td>
                    <label className="sr-only" htmlFor={`category-group-${category}`}>Evaluation group for {category}</label>
                    <select id={`category-group-${category}`} value={group} onChange={(event) => updateCategory(category, "group", event.target.value)} disabled={saving}>
                      {criteriaGroups.map(([criteriaGroup]) => <option key={criteriaGroup} value={criteriaGroup}>{criteriaGroup}</option>)}
                    </select>
                  </td>
                  <td>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeCategory(category)} disabled={saving}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h3>Evaluation criteria and weightages</h3>
        <p className="text-muted">
          Select one evaluation group at a time. A weightage is the maximum mark a jury can award.
        </p>
        <div className="form-group" style={{ maxWidth: "420px" }}>
          <label htmlFor="criteria-group">Evaluation group</label>
          <select id="criteria-group" value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} disabled={saving}>
            {criteriaGroups.map(([group]) => <option key={group} value={group}>{group}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addCriteriaGroup}>Add group</button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => removeCriteriaGroup(selectedGroup)} disabled={saving || criteriaGroups.length === 1}>Remove group</button>
        </div>
        {selectedGroup && (
          <>
            <div className="form-group">
              <label htmlFor="criteria-group-name">Group name</label>
              <input id="criteria-group-name" value={selectedGroup} onChange={(event) => updateCriteriaGroupName(selectedGroup, event.target.value)} disabled={saving} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <caption className="sr-only">Criteria and maximum marks for {selectedGroup}</caption>
                <thead>
                  <tr>
                    <th scope="col">Criterion</th>
                    <th scope="col">Maximum marks</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {activeCriteria.map((item, index) => (
                    <tr key={`${selectedGroup}-${index}`}>
                      <td>
                        <label className="sr-only" htmlFor={`criterion-${index}`}>Criterion name</label>
                        <input id={`criterion-${index}`} value={item.criterion} onChange={(event) => updateCriterion(selectedGroup, index, "criterion", event.target.value)} disabled={saving} />
                      </td>
                      <td>
                        <label className="sr-only" htmlFor={`weightage-${index}`}>Maximum marks</label>
                        <input id={`weightage-${index}`} type="number" min="1" max="100" value={item.weightage} onChange={(event) => updateCriterion(selectedGroup, index, "weightage", event.target.value)} disabled={saving} />
                      </td>
                      <td>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeCriterion(selectedGroup, index)} disabled={saving}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addCriterion(selectedGroup)} disabled={saving}>Add criterion</button>
          </>
        )}
      </section>

      {/* Import/export is intentionally informational until client-specific file mappings are supported. */}
      <section className="card">
        <h3>Import and Export</h3>
        <p className="text-muted">
          Team import column names and export formats remain fixed so existing registration files and reports stay compatible.
        </p>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </section>
    </form>
  );
}

export default ConfigurationPage;
