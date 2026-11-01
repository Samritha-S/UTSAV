/**
 * Utsav Planner - Render Creative Ideas
 *
 * Typesets bespoke cultural concepts as an editorial programme:
 * serif theme titles, course-by-course menu card, interactive activities,
 * decor concepts, and an editorial pull-quote for the budget fit note.
 *
 * STRICT SECURITY: Zero innerHTML/outerHTML/eval. Uses safe h().
 * NO badges or pills anywhere: source indicator is a plain sentence.
 */

import { h, createKolamMotif } from "./utils.js";
import { store } from "./state.js";
import { refinePlan } from "./api.js";

/**
 * Render the Creative Ideas Panel.
 * @param {Object} ideas - CreativeIdeas
 * @param {Object} eventSummary
 * @param {boolean} isActive
 * @returns {HTMLElement}
 */
export function renderIdeasPanel(ideas, eventSummary, isActive) {
  const panel = h(
    "section",
    {
      id: "panel-ideas",
      role: "tabpanel",
      "aria-labelledby": "tab-ideas",
      tabindex: "0",
      class: `programme-panel ${isActive ? "" : "is-hidden"}`,
    },

    // Masthead
    h(
      "div",
      { class: "panel-masthead" },
      h("h3", { class: "panel-headline" }, "Creative Themes & Culinary Programme"),
      h("p", { class: "panel-deck" }, "Ideas with an Indian soul, shaped by your budget and preferences."),
      h(
        "p",
        { class: "programme-source-notice" },
        ideas.source === "ai"
          ? "Written specifically for your celebration by Google Gemini."
          : "From our curated collection."
      ),
      createKolamMotif("divider", 64, 16)
    ),

    // 1. Celebratory Themes (3 Themes)
    h(
      "div",
      { class: "ideas-section" },
      h("h4", { class: "ideas-section-title" }, "Proposed Event Themes"),
      h(
        "div",
        { class: "themes-editorial-grid" },
        ...ideas.themes.map((theme, idx) => {
          return h(
            "article",
            { class: "theme-editorial-card" },
            h("div", { class: "theme-card-header" },
              h("span", { class: "theme-number" }, `Theme 0${idx + 1}`),
              h("h5", { class: "theme-title" }, theme.name)
            ),
            h("p", { class: "theme-desc" }, theme.description),
            theme.dress_code
              ? h("p", { class: "theme-dress-code" },
                  h("strong", {}, "Suggested Attire: "),
                  theme.dress_code
                )
              : null,
            theme.decor_elements && theme.decor_elements.length > 0
              ? h(
                  "div",
                  { class: "theme-elements" },
                  h("strong", { class: "elements-lead" }, "Decor Highlights: "),
                  h("span", { class: "elements-list" }, theme.decor_elements.join(" · "))
                )
              : null
          );
        })
      )
    ),

    // 2. Menu Card
    h(
      "div",
      { class: "ideas-section menu-card-section" },
      h("h4", { class: "ideas-section-title" }, "Catering & Multi-Course Menu Card"),
      h("p", { class: "section-deck" },
        "Strictly validated against your dietary preferences. Dishes with conflicting ingredients are automatically filtered out."
      ),
      h(
        "div",
        { class: "menu-card" },
        ...ideas.menu_suggestions.map((course) => {
          return h(
            "div",
            { class: "menu-course-block" },
            h("h5", { class: "course-title" }, course.meal_type),
            course.dietary_tags && course.dietary_tags.length > 0
              ? h("p", { class: "course-tags" }, course.dietary_tags.map(t => `[${t}]`).join(" "))
              : null,
            h(
              "ul",
              { class: "course-dishes-list" },
              ...course.dishes.map((dish) => h("li", { class: "dish-item" }, dish))
            ),
            h("div", { class: "course-rule", "aria-hidden": "true" })
          );
        })
      )
    ),

    // 3. Activities & Cultural Icebreakers
    h(
      "div",
      { class: "ideas-section" },
      h("h4", { class: "ideas-section-title" }, "Cultural Activities & Interactive Moments"),
      h(
        "div",
        { class: "activities-editorial-list" },
        ...ideas.activities.map((act) => {
          return h(
            "div",
            { class: "activity-editorial-entry" },
            h("h5", { class: "activity-title" }, act.title),
            h("p", { class: "activity-desc" }, act.description),
            act.suitable_for
              ? h("span", { class: "activity-audience" }, `Recommended for: ${act.suitable_for}`)
              : null
          );
        })
      )
    ),

    // 4. Staging & Decor Concepts
    h(
      "div",
      { class: "ideas-section" },
      h("h4", { class: "ideas-section-title" }, "Staging, Floral & Ambience Concepts"),
      h(
        "div",
        { class: "decor-editorial-list" },
        ...ideas.decor_ideas.map((dec) => {
          return h(
            "div",
            { class: "decor-editorial-entry" },
            h("h5", { class: "decor-area" }, dec.area),
            h("p", { class: "decor-concept" }, dec.concept),
            dec.suggested_materials && dec.suggested_materials.length > 0
              ? h("p", { class: "decor-materials" },
                  h("strong", {}, "Materials: "),
                  dec.suggested_materials.join(", ")
                )
              : null
          );
        })
      )
    ),

    // 5. Budget Fit Note (Editorial Pull Quote)
    ideas.budget_fit_note
      ? h(
          "div",
          { class: "ideas-section pullquote-section" },
          h("h4", { class: "ideas-section-title" }, "Stylist's Budget Fit Note"),
          h(
            "blockquote",
            { class: "editorial-pullquote" },
            h("p", {}, `"${ideas.budget_fit_note}"`)
          )
        )
      : null,

    // 6. Interactive Refinement Strip
    renderRefinementArea(eventSummary)
  );

  return panel;
}

/**
 * Render the natural language refinement input area.
 * @param {Object} eventSummary
 * @returns {HTMLElement}
 */
function renderRefinementArea(eventSummary) {
  const container = h(
    "div",
    { class: "refinement-box no-print" },
    h("h4", { class: "refinement-title" }, "Refine Creative Programme"),
    h("p", { class: "refinement-deck" },
      "Want to shift the aesthetic or highlight specific culinary traditions? Tell Gemini how to adjust the creative ideas."
    ),

    // Suggestion Links (plain underlined links, NOT chips or badges)
    h(
      "div",
      { class: "refine-suggestions-line" },
      h("span", { class: "suggestions-label" }, "Suggested adjustments: "),
      ...[
        "More traditional heritage aesthetic",
        "Focus on eco-friendly marigold and banana leaf decor",
        "Add live regional chaat and street food counters",
        "Intimate acoustic classical sitar and flute music",
      ].map((promptText) => {
        return h(
          "button",
          {
            type: "button",
            class: "refine-suggestion-link",
            onClick: () => {
              const inputEl = document.getElementById("refine-prompt-input");
              if (inputEl) {
                inputEl.value = promptText;
                inputEl.focus();
              }
            },
          },
          promptText
        );
      })
    ),

    // Refinement Form
    h(
      "form",
      {
        class: "refinement-form",
        onSubmit: async (e) => {
          e.preventDefault();
          const inputEl = document.getElementById("refine-prompt-input");
          const statusEl = document.getElementById("refine-status-msg");
          const submitBtn = document.getElementById("refine-submit-btn");

          const prompt = (inputEl?.value || "").trim();
          if (!prompt) return;

          if (statusEl) {
            statusEl.textContent = "Updating creative ideas with Gemini (~8–15s)...";
            statusEl.className = "refine-status-msg is-loading";
          }
          if (submitBtn) submitBtn.disabled = true;
          store.setRefineLoading(true);

          try {
            const updatedIdeas = await refinePlan(eventSummary, prompt);
            store.updateIdeas(updatedIdeas);

            if (statusEl) {
              statusEl.textContent = "Creative ideas updated successfully.";
              statusEl.className = "refine-status-msg is-success";
            }
            if (inputEl) inputEl.value = "";
          } catch (err) {
            store.setRefineError(err);
            if (statusEl) {
              statusEl.textContent = `Could not update ideas: ${err.userMessage || err.message}`;
              statusEl.className = "refine-status-msg is-error";
            }
          } finally {
            if (submitBtn) submitBtn.disabled = false;
            store.setRefineLoading(false);
          }
        },
      },
      h(
        "div",
        { class: "refinement-input-row" },
        h("label", { for: "refine-prompt-input", class: "sr-only" }, "Refinement instructions"),
        h("input", {
          type: "text",
          id: "refine-prompt-input",
          class: "form-input refinement-input",
          maxlength: "200",
          placeholder: "e.g. Make it more eco-friendly with clay pots and marigold flowers...",
        }),
        h(
          "button",
          {
            type: "submit",
            id: "refine-submit-btn",
            class: "btn btn-primary",
          },
          "Refine Ideas"
        )
      ),
      h("p", { id: "refine-status-msg", class: "refine-status-msg", "aria-live": "polite" })
    )
  );

  return container;
}
