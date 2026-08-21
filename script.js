let routes = [];

async function loadRoutes() {
  try {
    const response = await fetch('routes.json');
    if (!response.ok) {
      throw new Error('Nie udało się wczytać pliku z trasami');
    }
    routes = await response.json();
    
    // Opcjonalnie: zaktualizuj statystyki po wczytaniu danych
    if (typeof updateSelectedBadges === 'function') {
      updateSelectedBadges();
    }
  } catch (error) {
    console.error('Błąd podczas ładowania tras:', error);
  }
}

loadRoutes();

const selectedOperators = new Set();

let animationEnabled = true;

const animationToggle =
  document.getElementById("animation-toggle");

if (animationToggle) {
  animationToggle.addEventListener("click", () => {
    animationEnabled = !animationEnabled;

    animationToggle.classList.toggle(
      "active",
      animationEnabled
    );

    animationToggle.innerHTML = `
      <span class="toggle-dot"></span>
      ANIMATION: ${animationEnabled ? "ON" : "OFF"}
    `;
  });
}

function toggleOperator(button) {

  const operator = button.dataset.operator;

  button.style.setProperty("--button-color", button.dataset.color);

  if (selectedOperators.has(operator)) {

    selectedOperators.delete(operator);
    
    button.classList.remove("active");

  } else {

    selectedOperators.add(operator);

    button.classList.add("active");

  }

  updateSelectedBadges();

}

function updateSelectedBadges() {
  const badges = document.getElementById("selected-badges");
  const techOperators = document.getElementById("technical-operators");
  const techRoutes = document.getElementById("technical-routes");

  // Wyliczenie dostępnych tras na podstawie zaznaczonych operatorów
  const availableRoutes = routes.filter(route =>
    selectedOperators.has(route.operator)
  );

  // Aktualizacja liczników w sekcji Technical Info
  if (techOperators) techOperators.textContent = selectedOperators.size;
  if (techRoutes) techRoutes.textContent = availableRoutes.length;

  if (!badges) return;

  if (selectedOperators.size === 0) {
    badges.innerHTML = `
      <span class="selection-empty">
        Choose one or more operators.
      </span>
    `;
    return;
  }

  badges.innerHTML = "";

  selectedOperators.forEach(operator => {
    const button = document.querySelector(
      `.tab[data-operator="${operator}"]`
    );

    if (!button) return;

    const color = button.dataset.color;
    const badge = document.createElement("span");

    badge.className = "operator-badge";
    badge.style.setProperty("--badge-color", color);
    badge.innerHTML = `
      <span class="operator-badge-dot"></span>
      ${operator}
    `;

    badges.appendChild(badge);
  });
}

function animateRouteDraw(finalRoute) {
  const result = document.getElementById("result");
  const generator = document.querySelector(".generator");
  const generateButton = document.querySelector(".generate");

  if (!result || !generator || !generateButton) {
    return;
  }

  result.classList.add("result");
  result.classList.remove("empty", "route-in", "route-final");
  
  generator.classList.add("is-drawing");
  result.classList.add("route-drawing");

  generateButton.dataset.origialText = generateButton.textContent;

  const availableRoutes = routes.filter(route => selectedOperators.has(route.operator));

  if (availableRoutes.length === 0) {
    generator.classList.remove("is-drawing");
    result.classList.remove("route-drawing");
    return;
  }

  let currentIndex = 0;
  let elapsed = 0;

  const totalDuration = 1650;

  function drawFrame() {
    const randomRoute = availableRoutes[Math.floor(Math.random() * availableRoutes.length)];

    renderRoute(randomRoute, result, true);

    const progress = Math.min(elapsed / totalDuration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const delay = 35 + eased * 260;

    elapsed += delay;

    if (elapsed >= totalDuration) {
      finishDraw();
      return;
    }

    currentIndex++;
    setTimeout(drawFrame, delay);
  }

  function finishDraw() {
    renderRoute(finalRoute, result, false);

    result.classList.remove("route-drawing");
    result.classList.add("route-final");

    generator.classList.remove("is-drawing");

    generateButton.textContent = generateButton.dataset.origialText || "GENERATE ROUTE";

    setTimeout(() => {
      result.classList.remove("route-final");
    }, 500);
  }

  drawFrame();
}

function renderRoute(route, result, isDrawing = false) {
  document.documentElement.style.setProperty(
    "--operator-color",
    route.color
  );

  const stationList = route.stations
    .map((station, index) => {
      const isFirst = index === 0;
      const isLast = index === route.stations.length - 1;
      const isVia = route.via && station === route.via;

      let markerClass = "station-dot";

      if (isFirst || isLast) {
        markerClass += " station-end";
      } else if (isVia) {
        markerClass += " station-via";
      }

      return `
        <li class="${isFirst ? "station-first" : ""} ${isLast ? "station-last" : ""}">
          <span class="${markerClass}"></span>

          <span class="station-name">
            ${station}
          </span>
        </li>
      `;
    })
    .join("");

  result.innerHTML = `
    <div class="result-grid">

      <div class="route-details">

        <div class="route-number">
          ${route.number}
        </div>

        <div class="operator">

          <img
            class="operator-icon"
            src="${route.icon}"
            alt="${route.operator}"
          >

          ${route.operator}

        </div>

        <div class="route">

          ${route.from}

          <span class="route-arrow">
            →
          </span>

          ${route.to}

        </div>

        ${
          route.via
            ? `
              <div class="via">
                VIA ${route.via}
              </div>
            `
            : ""
        }

        <div class="route-description">

          Route:

          <br><br>

          ${route.stations.join(" → ")}
        </div>
      </div>


      <div class="route-info">

        <div class="stats">

          <div class="stat">

            <span class="stat-label">
              Estimated Route Time
            </span>

            <span class="stat-value">
              ${route.time}
            </span>
          </div>

          <div class="stat">

            <span class="stat-label">
              Number of Stations
            </span>

            <span class="stat-value">
              ${route.stations.length} Stations
            </span>
          </div>
        </div>


        <div class="stations-title">
          Route Stations
        </div>

        <ul class="stations">
          ${stationList}
        </ul>
      </div>
    </div>
  `;
}

/*
==================================================
Randomness
==================================================
*/

function randomRoute() {
  const result = document.getElementById("result");

  if (!result) return;

  if (selectedOperators.size === 0) {
    result.className = "result empty";

    result.innerHTML = `
      <div class="empty-message">
        Please select at least one operator to generate a route.
      </div>
    `;

    return;
  }

  let availableRoutes = routes.filter(route => selectedOperators.has(route.operator));

  const selectedLength = document.getElementById("routeLength")
    ? document.getElementById("routeLength").value : "any";

  const parseRouteTime = (timeStr) => {
    if(!timeStr) return 0;
    const match = timeStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  if(selectedLength === "short") {
    availableRoutes = availableRoutes.filter(route => parseRouteTime(route.time) <= 15);
  }

  if(selectedLength === "long") {
    availableRoutes = availableRoutes.filter(route => parseRouteTime(route.time) > 15);
  }

  if (availableRoutes.length === 0) {
    result.className = "result-empty";

    result.innerHTML = `
      <div class="empty-message">
        No routes match the selected filters.
      </div>
    `;

    return;
  } 


  const route =
    availableRoutes[
      Math.floor(Math.random() * availableRoutes.length)
    ];

  if (animationEnabled) {
    animateRouteDraw(route);
    return;
  }

  renderRoute(route, result, false);
  result.className = "result route-in";
}