// import { ExtensionContext, workspace, window } from "vscode";
// import * as fs from "fs";
const { workspace, window, ThemeIcon } = require("vscode");
const fs = require("fs");

class Book {
  constructor(extensionContext) {
    this.curr_page_number = 1;
    this.page_size = 50;
    this.totalPage = 0; // 总页数
    this.start = 0;
    this.end = this.page_size;
    this.filePath = "";
    this.extensionContext;
    this.extensionContext = extensionContext;
    this.bookTitle = "";
    this.showBook = true;
    this.timer = null;
    this.text = "";

    if (!Book.instance) {
      console.log("Book.instance init");
      Book.instance = this;
      this.init();
    }

    return Book.instance;
  }

  startTimer() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.updatePage();
    }, 5000);
  }

  getSize() {
    let size = this.text.length;
    this.totalPage = Math.ceil(size / this.page_size);
  }

  getFileName() {
    var file_name = this.filePath.split("/").pop();
    return file_name;
  }

  getPage(type) {
    var curr_page = this.curr_page_number;
    var page = 0;

    if (type === "previous") {
      if (curr_page <= 1) {
        page = 1;
      } else {
        page = curr_page - 1;
      }
    } else if (type === "next") {
      if (curr_page >= this.totalPage) {
        page = this.totalPage;
      } else {
        page = curr_page + 1;
      }
    } else if (type === "curr") {
      page = curr_page;
    }

    this.curr_page_number = page;
    // this.curr_page_number = this.extensionContext.globalState.get("book_page_number", 1);
  }

  updatePage() {
    workspace
      .getConfiguration()
      .update("new-thief-book.currPageNumber", this.curr_page_number, true);
  }

  getStartEnd() {
    this.start = this.curr_page_number * this.page_size;
    this.end = this.curr_page_number * this.page_size + this.page_size;
  }

  readFile() {
    if (this.filePath === "" || typeof this.filePath === "undefined") {
      window.showWarningMessage(
        "请填写TXT格式的小说文件路径 & Please fill in the path of the TXT format novel file"
      );
    }

    var data = fs.readFileSync(this.filePath, "utf-8");

    var line_break = workspace
      .getConfiguration()
      .get("new-thief-book.lineBreak");

    this.text = data
      .toString()
      .replace(/\n/g, line_break)
      .replace(/\r/g, " ")
      .replace(/　　/g, " ")
      .replace(/ /g, " ");
  }

  init() {
    this.filePath = workspace
      .getConfiguration()
      .get("new-thief-book.filePath");
    var is_english = workspace
      .getConfiguration()
      .get("new-thief-book.isEnglish");
    const pageSize = workspace
      .getConfiguration()
      .get("new-thief-book.pageSize");

    if (is_english === true) {
      this.page_size = pageSize * 2;
    } else {
      this.page_size = pageSize;
    }
    this.readFile();
    this.bookTitle = this.getFileName();
    this.getSize();
    this.curr_page_number = workspace
      .getConfiguration()
      .get("new-thief-book.currPageNumber");
  }

  getPreviousPage() {
    this.getPage("previous");
    this.getStartEnd();

    var page_info =
      this.curr_page_number.toString() + "/" + this.totalPage.toString();

    this.startTimer();
    return this.text.substring(this.start, this.end) + "    " + page_info;
  }

  getNextPage() {
    this.getPage("next");
    this.getStartEnd();

    var page_info =
      this.curr_page_number.toString() + "/" + this.totalPage.toString();

    this.startTimer();

    return this.text.substring(this.start, this.end) + "    " + page_info;
  }

  getJumpingPage(pageNum) {
    // vscode弹出输入框，输入页码
    // 输入页码后，跳转到指定页码
    // 页码输入框，只能输入数字

    if (pageNum) {
      this.curr_page_number = Math.max(
        Math.min(Number(pageNum), this.totalPage),
        1
      );
      this.getPage("curr");
      this.getStartEnd();

      var page_info =
        this.curr_page_number.toString() + "/" + this.totalPage.toString();

      this.startTimer();

      return this.text.substring(this.start, this.end) + "    " + page_info;
    }

    return window
      .showInputBox({
        placeHolder: "请输入页码",
        validateInput: (text) => {
          if (text === "") {
            return "请输入页码";
          }
          if (isNaN(Number(text))) {
            return "请输入数字";
          }
        },
      })
      .then((value) => {
        if (value === undefined) {
          return;
        }
        // this.curr_page_number = 最大不超过总页数，最小不小于1的value
        this.curr_page_number = Math.max(
          Math.min(Number(value), this.totalPage),
          1
        );
        this.getPage("curr");
        this.getStartEnd();

        var page_info =
          this.curr_page_number.toString() + "/" + this.totalPage.toString();

        this.startTimer();

        return this.text.substring(this.start, this.end) + "    " + page_info;
      });
  }

  displayCode() {
    this.showBook = !this.showBook;
    const lauage_arr_list = ['$(book)'];
    const index = 0;
    if (!this.showBook) {
      return lauage_arr_list[index];
    } else {
      return this.getJumpingPage(this.curr_page_number);
    }
  }

  showPage() {
    return this.getJumpingPage(this.curr_page_number);
  }

  async reloadBook() {
    // 重置页码
    await workspace
      .getConfiguration()
      .update("new-thief-book.currPageNumber", 1, true);
    this.init();
    return this.getJumpingPage(1);
  }

  // 添加书签
  addBookMark() {
    // 弹出输入框，输入书签describe
    // 输入书签后，保存书签
    return window
      .showInputBox({
        placeHolder: "请输入书签描述",
        validateInput: (text) => {
          if (text === "") {
            return "请输入书签描述";
          }
        },
      })
      .then((value) => {
        if (value === undefined) {
          return;
        }
        let bookmark = {
          id: this.bookTitle + this.curr_page_number,
          describe: value,
          bookTitle: this.bookTitle,
          curr_page_number: this.curr_page_number,
          totalPage: this.totalPage,
          filePath: this.filePath,
        };

        let bookmarks = this.extensionContext.globalState.get("bookmarks", []);
        bookmarks.push(bookmark);
        return this.extensionContext.globalState
          .update("bookmarks", bookmarks)
          .then(() => {
            return `为${this.bookTitle}添加书签成功`;
          });
      });
  }

  // 展开书签列表，选择应用书签页码
  getBookMarkList() {
    let bookmarks = this.extensionContext.globalState.get("bookmarks", []);
    if (bookmarks.length === 0) {
      return window.showInformationMessage("没有书签");
    }
    let items = bookmarks
      .filter((bookmark) => bookmark.bookTitle === this.bookTitle)
      .map((bookmark) => {
        return {
          label: bookmark.describe,
          description: bookmark.curr_page_number.toString(),
          buttons: [
            {
              iconPath: new ThemeIcon("trash"),
              tooltip: "删除书签",
            },
          ],
        };
      });

    const buttons = [
      {
        iconPath: new ThemeIcon("trash"),
        tooltip: "删除所有书签",
      },
    ];

    return new Promise((resolve) => {
      const quickPick = window.createQuickPick();
      quickPick.items = items;
      quickPick.buttons = buttons;

      quickPick.onDidAccept(() => {
        const selection = quickPick.selectedItems[0];
        if (selection) {
          resolve(this.getJumpingPage(selection.description));
        }
      });

      quickPick.onDidTriggerButton((button) => {
        if (button.tooltip === "删除所有书签") {
          // 删除所有书签
          // 清空bookmarks
          this.extensionContext.globalState.update("bookmarks", []).then(() => {
            // 提示删除成功
            window.showInformationMessage("删除所有书签成功");
            // 关闭quickPick
            quickPick.hide();
          });
        }
      });

      quickPick.onDidTriggerItemButton(({ button, item }) => {
        if (button.tooltip === "删除书签") {
          // 删除单个书签
          // 从bookmarks中删除
          let bookmarks = this.extensionContext.globalState.get(
            "bookmarks",
            []
          );
          bookmarks = bookmarks.filter(
            (bookmark) => bookmark.describe !== item.label
          );
          this.extensionContext.globalState
            .update("bookmarks", bookmarks)
            .then(() => {
              // 提示删除成功，刷新书签列表
              window.showInformationMessage("删除书签成功");
              // 如果还有书签，刷新书签列表，如果没有书签，关闭quickPick
              if (bookmarks.length > 0) {
                this.getBookMarkList();
              } else {
                quickPick.hide();
              }
            });
        }
      });

      quickPick.show();
    });
  }
}

module.exports = Book;
