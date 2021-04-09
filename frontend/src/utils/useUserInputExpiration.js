/*
 * useUserInputExpiration.js
 */

import { useEffect } from 'react';

export default function useUserInputExpiration(expirationFunction, expirationDelay) {
    let timer;

    const startTimer = () => {
        timer = setTimeout(expirationFunction, expirationDelay);
    }

    const resetTimer = () => {
        if (timer)
            clearTimeout(timer);
        startTimer()
    };

    useEffect(() => {
        const events = [
            'mousedown',
            'click',
            'pageshow',
            'keypress'
        ];

        for (let i in events) {
            window.addEventListener(events[i], resetTimer);
        }

        startTimer()
        return () => {
            if (timer)
                clearTimeout(timer);

            for(let i in events){
                window.removeEventListener(events[i], resetTimer);
            }
        }
    },[]);

}