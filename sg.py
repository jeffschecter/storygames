import os
import sys

import bs4
import gflags
import requests

from multiprocessing import pool


FLAGS = gflags.FLAGS
gflags.DEFINE_integer(
    "earliest", 1,
    "First thread to retrieve.")
gflags.DEFINE_integer(
    "latest", None,
    "Last thread to retrieve.")
gflags.DEFINE_string(
    "root", "http://story-games.com/forums/",
    "Base URL of the forum.")
gflags.DEFINE_integer(
    "poolsize", 10,
    "Number of simultaneous threads with which to pull listing data.")
gflags.DEFINE_string(
    "out_dir", "storygames",
    "Directory to write scraped threads.")


# ---------------------------------------------------------------------------- #
# Parsing.                                                                     #
# ---------------------------------------------------------------------------- #

def parse_page(soup, include_title=False):
    page = bs4.BeautifulSoup(features="html.parser")
    if include_title:
        page.append(soup.select("h1")[0])
        page.append(soup.select(".ItemDiscussion")[0])
    for div in soup.select(".ItemComment"):
        page.append(div)
    return page


# ---------------------------------------------------------------------------- #
# Fetching.                                                                    #
# ---------------------------------------------------------------------------- #

def load_url(url):
    try:
        doc = requests.get(url)
        if doc.status_code != 200:
            return False, "code {}".format(doc.status_code)
        return True, bs4.BeautifulSoup(doc.content, features="html.parser")
    except Exception as e:
        return False, str(e)


def get_latest_discussion_id():
    success, soup = load_url(FLAGS.root)
    if not success:
        raise RuntimeError("Failed to fetch main page.")
    thread_ids = [
        int(node["href"].partition("/discussion/")[-1].partition("/")[0])
        for node in soup.select('a[href*="/discussion/"]')]
    return max(thread_ids)


def get_raw_page(thread_id, page=1):
    url = FLAGS.root + "discussion/{}/x/p{}".format(thread_id, page)
    return load_url(url)


def get_thread(thread_id):
    success, first_page = get_raw_page(thread_id)
    if not success:
        return False, first_page

    parsed_pages = parse_page(first_page, include_title=True)

    page_after = first_page.select("#PagerAfter")
    if page_after:
        last_page = int(
            page_after[0].select(".LastPage")[0]["href"].rpartition("/p")[-1])
        for page_number in range(2, last_page + 1):
            success, latest_page = get_raw_page(thread_id, page=page_number)
            if not success:
                return False, "failed fetching page {} {}".format(
                    page_number, latest_page)
            parsed_pages.append(latest_page)

    return True, repr(parsed_pages)


def process_thread(thread_id):
    success, content = get_thread(thread_id)
    if success:
        path = os.path.join(FLAGS.out_dir, "{}.html".format(thread_id))
        with open(path, "w+") as f:
            f.write(content)
    else:
        path = os.path.join(FLAGS.out_dir, ".errors")
        with open(path, "a+") as f:
            f.write("{}\t{}\n".format(thread_id, content))
    print("processed {}".format(thread_id))


# ---------------------------------------------------------------------------- #
# Driver.                                                                      #
# ---------------------------------------------------------------------------- #

def main():
    latest = FLAGS.latest or get_latest_discussion_id()
    to_fetch = list(range(latest, FLAGS.earliest - 1, -1))
    tpool = pool.ThreadPool(FLAGS.poolsize)
    tpool.map(process_thread, to_fetch)
    tpool.close()


if __name__ == "__main__":
    FLAGS(sys.argv)
    main()
