/*
 * useUserInputExpiration.js
 */

import { useEffect } from 'react';

/*
 * Runs a callback after a delay without user interaction
 * @param {Function} expirationFunction - The function to run at expiration
 * @param {number} expirationDelay - The delay in milliseconds
 * @example
 */
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

            for (let i in events) {
                window.removeEventListener(events[i], resetTimer);
            }
        }
    }, []);

}