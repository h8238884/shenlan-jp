# Wedding Invite H5 (Chinese)

Static H5 invitation with 4-page vertical swipe (Swiper).

## Run locally

```bash
cd /Users/shenlan/clawd/projects/wedding-invite-h5
python3 -m http.server 8088
```

Open: http://localhost:8088

## Customize
- Background image: `assets/bg.jpg`
- BGM: put `assets/bgm.mp3` and set `BGM_SRC` in `assets/app.js`.
  - Mobile autoplay is restricted; user must tap the music button once.
- Text: edit `index.html`.

## Recommended size
Designed for mobile portrait (375×812 base), responsive.
