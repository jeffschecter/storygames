const LAST_VISITED = "last-visited";
const DEFAULT_HEADLINE = "Story Games Index";
const LIST_INDEX = 0;

const domainOrigin = 'https://rickard80.github.io/storygames/archive/';

let headline = DEFAULT_HEADLINE;
var lastIndex = 0;
var currentPageIndex = 0;
var showContent = false;

var indexInput = null;
var listIndexes = null;

function googleSearch(event) {
  const API_KEY = 'AIzaSyCQmwK7JeBoXmmPiwROOf0G0ATkwEuRy30';
  const SEARCH_ENGINE_ID = '72ea68d1161039cae';

  let searchInput = event.currentTarget;
  let keywords = searchInput.value.trim();

  if (keywords.length > 3) {
    searchInput.placeholder = "Search";

    fetchData(`https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${keywords}`, function() {
      if (this.readyState == 4 && this.status == 200 && this.responseText) {
        let response = JSON.parse(this.responseText)
        console.log('Google Search', response);
      }
    });
  } else {
    searchInput.value = "";
    searchInput.placeholder = "Too short. Min 4 characters."
  }
}

function switchTab(event) {
  let className = event.target.classList[0];
  let showList = className == 'list';
  let state = (showList) ? LIST_INDEX : currentPageIndex;
  let index = (showList) ? '' : currentPageIndex
  let firstTimeVisitedLoadingPage = !showList && headline == DEFAULT_HEADLINE && currentPageIndex;

  if (firstTimeVisitedLoadingPage) {
    loadDoc(currentPageIndex);
  } else {
    setBodyClass(className);
  }

  updateLocation(state, null, index);
}

function setBodyClass(className) {
  showContent = className == 'page';

  document.querySelector('body').classList.toggle('show-content', showContent);
  setDocumentTitle(showContent ? headline : DEFAULT_HEADLINE);

  if (className == 'list' && currentPageIndex) {
    scrollToListItem();
  }
}

function updateLocation(state, title, index) {
  scrollTo(0, 0);
  updateURL(state, title, index);
}

function updateURL(state, title, url, replace) {
  url = `?${url}`;

  if (replace) {
    history.replaceState(state, title, url);
  } else {
    history.pushState(state, title, url);
  }
}

function setDocumentTitle(title) {
  document.title = `SGI :: ${title}`;
}

function fetchData(url, callbackFn) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    callbackFn.apply(this);
  };
  xhttp.open("GET", url, true);
  xhttp.send();
}

function loadDoc(pageIndex, increase) {
  let pageEl = document.getElementById("page");

  currentPageIndex = parseInt(pageIndex);
  indexInput.value = pageIndex;

  pageEl.innerHTML = "<h1 class='loading'>Loading...</h1>"
  setBodyClass('page');

  fetchData(`${domainOrigin}${pageIndex}.html`, function() {
      if (this.readyState == 4 && this.status == 200) {
    console.log('document loaded:', pageIndex);

        let responseText = this.responseText;
        responseText = cleanFromLineBreaks(responseText);
        responseText = replaceAnchorLink(responseText);
        responseText = changeInternalLinks(responseText);

        let headlinePattern = /(?<=<h1>).*?(?=<\/h1)/;
        headline = responseText.match(headlinePattern);
        setDocumentTitle(headline);

        pageEl.innerHTML = responseText;

        if (location.hash) {
          scrollToAnchor();
        }
      } else if (this.readyState == 4) {
        let modification = (increase) ? 1 : -1;
        let newIndex = checkRange(pageIndex + modification);

        updateURL(newIndex, null, newIndex, "replace");
        loadDoc(newIndex, increase);
      }
  });

  localStorage.setItem(LAST_VISITED, pageIndex);
}

function scrollToListItem() {
  const WAIT_FOR_DOM_TO_LOAD = 1000;
  var id = '';

  for (let indexEl of listIndexes) {
    if (getIndex(indexEl.textContent) == currentPageIndex) {
      setTimeout(() => {
        indexEl.scrollIntoView();
      }, WAIT_FOR_DOM_TO_LOAD);
      break;
    }
  }
}

function getIndex(textContent) {
  return textContent.substring(0, textContent.length-1);
}

function scrollToAnchor() {
  let anchorEl = document.getElementById('page').querySelector(`a[href="${location.hash}"`)
  anchorEl.scrollIntoView();
}

function cleanFromLineBreaks(text) {
  return text.replaceAll('\\n', '');
}

function replaceAnchorLink(text) {
  return text.replaceAll(/\/forums\/discussion\/comment\/\d+\//g, '');
}

// Examples:
// (new) "http://story-games.com/forums/discussion/9214/p1" rel="nonsense"
// (old) "http://www.story-games.com/forums/discussion/9214/p1" rel="nonsense"
function changeInternalLinks(text) {
  text = text.replaceAll(/\"https?:\/\/(www\.)?story-games\.com\/forums\/discussion\/\d+\S+\"/g, (match) => {
      let pageIndex = match.match(/(?<=\/)\d+(?=\/)/);      // new internal links
      return `"?${pageIndex}"`
  });

  text = text.replaceAll(/\"https?:\/\/(www\.)?story-games\.com\/forums\/comments\.php\?DiscussionID=\d+\S+\"/g, (match) => {
      let pageIndex = match.match(/(?<=DiscussionID=)\d+/); // old internal links
      return `"?${pageIndex}"`
  });

  return text
}

function checkRange(newIndex) {
  newIndex = parseInt(newIndex);

  if (newIndex < indexInput.min) { newIndex = indexInput.min; }
  if (newIndex > indexInput.max) { newIndex = indexInput.max; }

  return newIndex
}

function getLinkedIndex() {
  return parseInt(window.location.search.replace('?', ''))  ;
}

function autoLoadDoc() {
  if (!loadDirectLink()) {
    setLastVisitedDocOnInput();
  }
}

function loadDirectLink() {
  let linkedIndex = getLinkedIndex();

  if (!isNaN(linkedIndex)) {
    loadDoc(linkedIndex);
    return true
  }

  return false
}

function setLastVisitedDocOnInput() {
  let lastVisitedPage = parseInt(localStorage.getItem(LAST_VISITED));

  if (!isNaN(lastVisitedPage)) {
    currentPageIndex = lastVisitedPage;
    indexInput.value = lastVisitedPage;
    // loadDoc(lastVisitedPage);
    // updateLocation(lastVisitedPage, null, lastVisitedPage);
  }
}

function setClickListeners() {
  indexInput = document.getElementById('index');

  listIndexes = document.getElementById('list').querySelectorAll('a > i:first-child');
  indexInput.max = getIndex(listIndexes[listIndexes.length - 1].textContent);

  console.log(indexInput.max)


  setListClickListeners();
  setMenuClickListeners();

  window.addEventListener('popstate', catchBrowserNavigation);
}

function catchBrowserNavigation(event) {
  let pageIndex = event.state;
  let linkedIndex = getLinkedIndex();
  let goToList = isNaN(linkedIndex) && !pageIndex,
      historyStoredListPage = pageIndex == LIST_INDEX;
      newDoc = pageIndex && linkedIndex != currentPageIndex || linkedIndex != currentPageIndex,
      navigateOnHashToSamePage = linkedIndex == currentPageIndex && showContent,
      jumpToLinkPage = pageIndex && linkedIndex == currentPageIndex;

  if (goToList) {
// console.log('goToList')
    setBodyClass('list')
  } else if (historyStoredListPage) {
// console.log('historyStoredListPage')
    setBodyClass('list');
  } else if (newDoc) {
// console.log('newDoc')
    loadDoc(pageIndex || linkedIndex);
  } else if (location.hash) {
    if (navigateOnHashToSamePage) {
// console.log('navigateOnHashToSamePage')
      scrollToAnchor();
    } else {
// console.log('new hash and new doc')
      loadDoc(linkedIndex);
    }
  } else {
    setBodyClass('page');
// console.log('else, scrollTo')
    scrollTo(0, 0);
  }
}

function setListClickListeners() {
  document.addEventListener('click', (event) => {
    let target = event.target;
    let aElem = (target.tagName == 'A') ? target : (target.parentNode && target.parentNode.tagName == 'A') ? target.parentNode : null;
    let href = aElem && aElem.href.match(/\?\d+$/);
    let isInternalLink = (href) ? href[0] : false;

    if (isInternalLink) {
      let pageIndex = isInternalLink.substr(1);

      loadDoc(pageIndex);
      updateLocation(pageIndex, null, pageIndex);
      event.preventDefault();
    }
  });
}

function getIndexFrom(textContent) {
  return textContent.match(/^\d+/)[0];
}

function setMenuClickListeners() {
  const menuListItems = document.querySelectorAll('footer > div');
  const searchBarInput = document.getElementById('search');

  menuListItems.forEach((menuItem) => {
    let className = menuItem.classList[0];
    menuItem.addEventListener('click', switchTab);
  });

  indexInput.addEventListener('change', (event) => {
    let newIndex = checkRange(event.target.value);
    loadDoc(newIndex, currentPageIndex < newIndex);
    updateLocation(newIndex, null, newIndex);
  });

  searchBarInput.addEventListener('change', googleSearch);
}
