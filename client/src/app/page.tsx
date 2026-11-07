'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Browser from './Browser';
const styles = new Proxy({} as Record<string, string>, { get: (_t, key) => String(key) });

export default function Home() {
  const [people, setPeople] = useState<string[]>([]);
  const [person, setPerson] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .people()
      .then((list) => {
        setPeople(list);
        try {
          const saved = localStorage.getItem('person');
          if (saved && list.includes(saved)) setPerson(saved);
        } catch {}
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const choose = (name: string) => {
    setPerson(name);
    try {
      localStorage.setItem('person', name);
    } catch {}
  };

  return (
    <main className={styles.app}>
      <header className={styles.top}>
        <h1 className={styles.brand}>Small Web</h1>
        <label className={styles.who}>
          Browsing as
          <select value={person} onChange={(e) => choose(e.target.value)}>
            <option value="" disabled>
              Choose a person
            </option>
            {people.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </header>
      {error && <p className={styles.error}>Cannot reach the API: {error}</p>}
      {person ? (
        <Browser key={person} person={person} />
      ) : (
        <p className={styles.empty}>Pick a person to start browsing.</p>
      )}
    </main>
  );
}