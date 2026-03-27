import { setToast } from "./utils.js";

const homeStudyCard = document.getElementById("homeStudyCard");

function initHomeStudyCard() {
  if (!homeStudyCard) return;

  const goStudy = () => {
    homeStudyCard.classList.add("is-flipped");
    window.setTimeout(() => {
      window.location.href = "study.html";
    }, 420);
  };

  homeStudyCard.addEventListener("click", goStudy);

  homeStudyCard.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goStudy();
    }
  });
}

function init() {
  initHomeStudyCard();
}

init();

window.addEventListener("error", () => {
  setToast("Something went wrong on the home page.");
});