$(document).ready(function() {
        (function($) {
    $(function() {
        var selectField = $('#id_kind'),
            verified = $('.parent_fieldset');

        function toggleVerified(value) {
            if (value =='room') {
                verified.hide();
            } else {
                verified.show();
            }
        }

        // show/hide based on selected value
        toggleVerified(selectField.val());

        // show/hide on change
        selectField.change(function() {
            toggleVerified($(this).val());
        });
    });
})(django.jQuery);
});