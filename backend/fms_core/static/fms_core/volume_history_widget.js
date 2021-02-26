const handleChange = (oldValue, latestValue, hiddenInput, displayInput) => {
    try {
        if (parseFloat(displayInput.value).toFixed(3) ===
                parseFloat(latestValue).toFixed(3) && oldValue.length > 0) {
            // Haven't updated value
            hiddenInput.value = JSON.stringify(oldValue);
            hiddenInput.setAttribute("data-changed", "false");
        } else {
            hiddenInput.value = JSON.stringify([...oldValue, {
                date: (new Date()).toISOString(),
                update_type: "update",
                volume_value: displayInput.value,
            }]);
            hiddenInput.setAttribute("data-changed", "true");
        }
    } catch (e) {
        console.error(e);
    }
};

document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form").forEach(form => {
        form.querySelectorAll("[data-volume-history=true]").forEach(element => {
            element.setAttribute("data-changed", "false");

            const oldValue = (element.value && element.value !== "null") ? JSON.parse(element.value) : [];
            const latestValue = oldValue.length > 0 ? oldValue[oldValue.length - 1].volume_value : "0";

            const formRow = element.parentElement.parentElement;
            formRow.classList.remove("hidden");

            const label = element.parentElement.querySelector("label");
            label.innerText = label.innerText.replace(" history", "");

            const displayInput = document.createElement("input");
            displayInput.id = `display__${element.id}`;
            displayInput.setAttribute("type", "number");
            displayInput.setAttribute("min", "0");
            displayInput.value = latestValue;

            displayInput.addEventListener("change", () => {
                handleChange(oldValue, latestValue, element, displayInput);
            });
            handleChange(oldValue, latestValue, element, displayInput);

            element.insertAdjacentElement("afterend", displayInput);

            // Set up form to update the dates of new volume values upon submit
            form.addEventListener("submit", () => {
                if (element.getAttribute("data-changed") === "true") {
                    const val = JSON.parse(element.value);
                    val[val.length - 1].date = (new Date()).toISOString();
                    element.value = JSON.stringify(val);
                }
            });
        });
    });
});
