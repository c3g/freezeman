from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from fms_core.models import PreferenceOption, PreferenceSetting
from fms_core.serializers import PreferenceOptionSerializer, PreferenceSettingSerializer
from fms_core.services.preference import set_preferences, get_all_preferences
from django.core.exceptions import ValidationError

class PreferenceViewSet(viewsets.ModelViewSet):
    @action(detail=False, methods=['get'])
    def options(self, request):
        options = PreferenceOption.objects.all()
        serializer = PreferenceOptionSerializer(options, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'post'], permission_classes=[IsAuthenticated])
    def user_preferences(self, request):
        if request.method == 'GET':
            preferences = get_all_preferences(request.user)
            return Response(preferences)
        elif request.method == 'POST':
            serializer = PreferenceSettingSerializer(data=request.data, many=True)
            if serializer.is_valid():
                data = serializer.validated_data
                if isinstance(data, dict):
                    set_preferences(
                        request.user,
                        {
                            item['option']['name']: item['value'] for item in data
                        }
                    )
                else:
                    raise ValidationError("Expected an object of preference settings.")
                return Response(get_all_preferences(request.user))
            return Response(serializer.errors, status=400)