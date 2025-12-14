# Guide de Déploiement (Vercel)

Votre code est maintenant sur GitHub. Pour le mettre en ligne gratuitement, la méthode la plus simple est d'utiliser **Vercel**.

## Étapes de mise en ligne

1.  **Créer un compte**
    *   Allez sur [vercel.com](https://vercel.com) et créez un compte (utilisez "Continue with GitHub" pour que ce soit plus simple).

2.  **Importer le projet**
    *   Sur votre tableau de bord Vercel, cliquez sur **"Add New..."** -> **"Project"**.
    *   Dans la liste "Import Git Repository", trouvez `vacancesassocies` et cliquez sur **Import**.

3.  **Configurer le Mot de Passe (TRES IMPORTANT)**
    *   Dans la section **"Environment Variables"** (cliquez pour déplier) :
    *   Ajoutez une nouvelle variable pour le mot de passe :
        *   **Name** : `VITE_APP_PASSWORD`
        *   **Value** : `Jeromeduret2025!`

    *   **Ajoutez ensuite les variables Firebase suivantes :**
        *   `VITE_FIREBASE_API_KEY` : `AIzaSyC2jWQM2KnpyrJemodyEqSJkjve387A5vU`
        *   `VITE_FIREBASE_AUTH_DOMAIN` : `vacances-associes.firebaseapp.com`
        *   `VITE_FIREBASE_PROJECT_ID` : `vacances-associes`
        *   `VITE_FIREBASE_STORAGE_BUCKET` : `vacances-associes.firebasestorage.app`
        *   `VITE_FIREBASE_MESSAGING_SENDER_ID` : `812407528212`
        *   `VITE_FIREBASE_APP_ID` : `1:812407528212:web:b3e5ee7d067adac6914001`
        *   `VITE_FIREBASE_MEASUREMENT_ID` : `G-5LT3MVV8VP`

    *   Cliquez sur **Add** pour chacune d'elles.

4.  **Déployer**
    *   Cliquez sur le bouton **"Deploy"**.
    *   Attendez une minute que Vercel construise le site.

5.  **C'est fini !**
    *   Vercel vous donnera un lien (ex: `vacancesassocies.vercel.app`).
    *   C'est ce lien que vous pouvez partager. Le mot de passe sera demandé à l'entrée.

## Mises à jour futures
Chaque fois que vous ferez des changements et que vous les "pousserez" sur GitHub (comme nous venons de le faire), Vercel mettra automatiquement à jour le site en ligne.
