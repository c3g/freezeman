const ROOT_CONTAINER_TYPES = ["room"];

const hideElement = e => e.setAttribute("style", "display: none");
const showElement = e => e.removeAttribute("style");

document.addEventListener("DOMContentLoaded", () => {
    const selectField = document.getElementById("id_kind");
    const dependentFieldsets = document.querySelectorAll(".parent_fieldset");

    const toggleDependentField = () =>
        dependentFieldsets.forEach(ROOT_CONTAINER_TYPES.includes(selectField.value)
            ? hideElement
            : showElement);

    // show/hide based on selected value
    toggleDependentField();

    // show/hide on change
    selectField.addEventListener("change", () => toggleDependentField());
});
