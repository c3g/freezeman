$(document).ready(function() {
(function($) {
    $(function() {
        var selectField = $('#id_kind'),
            dependentField = $('.parent_fieldset');

        function toggleDependentField(value) {
            if (value =='room') {
                dependentField.hide();
            } else {
                dependentField.show();
            }
        }

        // show/hide based on selected value
        toggleDependentField(selectField.val());

        // show/hide on change
        selectField.change(function() {
            toggleDependentField($(this).val());
        });
    });
})(django.jQuery);
});