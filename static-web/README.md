# CLASR Static Website

This is a static implementation of the CLASR website handoff.

## Preview

```bash
python3 -m http.server 5173 -d outputs/clasr-website
```

Open:

```text
http://127.0.0.1:5173/
```

## Routes

- `/`
- `/register/`
- `/login/`
- `/onboarding/role/`
- `/onboarding/tier/`
- `/pricing/`
- `/dashboard/`
- `/dashboard/reading/`

## Notes

- Uses the supplied logo, annotation, process, favicon, upload, chevron, and arrow SVG assets.
- Loads the provided Adobe Typekit kit: `krb7yow`.
- Provides a single Google social sign-in placeholder alongside email authentication.
- Built as static HTML/CSS/JS for fast deployment and easy hosting.
