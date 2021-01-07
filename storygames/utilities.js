const LAST_VISITED = "last-visited";
const DEFAULT_HEADLINE = "Story Games Index";
const LIST_INDEX = 0;

const domainOrigin = 'https://rickard80.github.io/storygames/archive/';

let headline = DEFAULT_HEADLINE;
var lastIndex = 0;
var currentPageIndex = 0;
var showContent = false;

var indexInput = null;

function switchTab(event) {
  let className = event.currentTarget.classList[0];
  let showList = className == 'list';
  let state = (showList) ? LIST_INDEX : currentPageIndex;
  let index = (showList) ? '' : currentPageIndex

  setBodyClass(className);

  updateLocation(state, null, index);
}

function setBodyClass(className) {
  showContent = className == 'page';

  document.querySelector('body').classList.toggle('show-content', showContent);
  setDocumentTitle(showContent ? headline : DEFAULT_HEADLINE);
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

function loadDoc(pageIndex, increase) {
  var xhttp = new XMLHttpRequest();
  let pageEl = document.getElementById("page");

  currentPageIndex = parseInt(pageIndex);
  indexInput.value = pageIndex;

  pageEl.innerHTML = "<h1 class='loading'>Loading...</h1>"
  setBodyClass('page');

  xhttp.onreadystatechange = function() {
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
  };

  xhttp.open("GET", `${domainOrigin}${pageIndex}.html`, true);
  xhttp.send();

  localStorage.setItem(LAST_VISITED, pageIndex);
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
  text = text.replaceAll(/\"http:\/\/(www\.)?story-games\.com\/forums\/discussion\/\d+\S+\"/g, (match) => {
      let pageIndex = match.match(/(?<=\/)\d+(?=\/)/);      // new internal links
      return `"?${pageIndex}"`
  });

  text = text.replaceAll(/\"http:\/\/(www\.)?story-games\.com\/forums\/comments\.php\?DiscussionID=\d+\S+\"/g, (match) => {
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
    loadLastVisitedDoc()
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

function loadLastVisitedDoc() {
  let lastVisitedPage = parseInt(localStorage.getItem(LAST_VISITED));

  if (!isNaN(lastVisitedPage)) {
    loadDoc(lastVisitedPage);
    updateLocation(lastVisitedPage, null, lastVisitedPage);
  }
}

function setClickListeners() {
  indexInput = document.getElementById('index');

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
// console.log('invalidSiteNavigation')
    setBodyClass('list')
  } else if (historyStoredListPage) {
// console.log('invalidSiteNavigation')
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
//   } else if (jumpToLinkPage) {
// console.log('jumpToLinkPage')
  } else {
    setBodyClass('page');
// console.log('else, scrollTo')
    scrollTo(0, 0);
  }
}

function setListClickListeners() {
  const listItems = document.querySelectorAll('#list > div.row');
  let lastIndexTextContent = listItems[listItems.length-1].textContent;

  lastIndex = getIndexFrom(lastIndexTextContent);
  indexInput.max = lastIndex;

  listItems.forEach((listItem) => {
    listItem.addEventListener('click', () => {
      let pageIndex = getIndexFrom(listItem.textContent);
      loadDoc(pageIndex);
      updateLocation(pageIndex, null, pageIndex);
    });
  });
}

function getIndexFrom(textContent) {
  return textContent.match(/^\d+/)[0];
}

function setMenuClickListeners() {
  const menuListItems = document.querySelectorAll('footer > div');

  menuListItems.forEach((menuItem) => {
    let className = menuItem.classList[0];
    menuItem.addEventListener('click', switchTab);
  });

  indexInput.addEventListener('change', (event) => {
    let newIndex = checkRange(event.target.value);
    loadDoc(newIndex, currentPageIndex < newIndex);
    updateLocation(newIndex, null, newIndex);
  });
}
