import { chapters } from "./data/chapters.js";
import { SiteHeader } from "./components/SiteHeader.jsx";
import { CueRail } from "./components/CueRail.jsx";
import { Atmosphere } from "./components/Atmosphere.jsx";
import { Prologue } from "./scenes/Prologue.jsx";
import { Identity } from "./scenes/Identity.jsx";
import { Evolution } from "./scenes/Evolution.jsx";
import { Systems } from "./scenes/Systems.jsx";
import { Scale } from "./scenes/Scale.jsx";
import { Intelligence } from "./scenes/Intelligence.jsx";
import { Recognition } from "./scenes/Recognition.jsx";
import { Epilogue } from "./scenes/Epilogue.jsx";
import { useActiveChapter } from "./hooks/useActiveChapter.js";
import { useLamps } from "./hooks/useLamps.js";
import "./styles/atmosphere.css";

const chapterIds = chapters.map((c) => c.id);

export function App() {
  const active = useActiveChapter(chapterIds);
  useLamps();

  return (
    <>
      <Atmosphere active={active} />
      <a className="skip-link" href="#identity">
        Skip to content
      </a>
      <SiteHeader active={active} />
      <CueRail active={active} />
      <main id="top">
        <Prologue />
        <div className="page">
          <Identity />
          <Evolution />
          <Systems />
          <Scale />
          <Intelligence />
          <Recognition />
          <Epilogue />
        </div>
      </main>
    </>
  );
}
