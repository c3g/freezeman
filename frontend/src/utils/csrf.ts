import { API_BASE_PATH } from "../config";

// https://fractalideas.com/blog/making-react-and-django-play-well-together-single-page-app-model/

export let _csrfToken = ''

export async function getCsrfToken(): Promise<string> {
    if (_csrfToken === '') {
        const response = await fetch(`${API_BASE_PATH}/csrf/`, {
          credentials: 'omit',
        });
        const data = await response.json();
        _csrfToken = data.csrfToken;
      }
      return _csrfToken;
}
