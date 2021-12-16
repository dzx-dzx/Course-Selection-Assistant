// ==UserScript==
// @name         SJTU-Course Selection Assistant
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  添加一个打开选课社区(course.sjtu.plus)的按钮
// @author       Me
// @match        https://i.sjtu.edu.cn/xsxk/zzxkyzb_cxZzxkYzbIndex.html*
// @connect f002.backblazeb2.com
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_xmlhttpRequest
// @downloadURL https://raw.githubusercontent.com/dzx-dzx/Course-Selection-Assistant/master/Untitled-1.user.js
// @updateURL https://raw.githubusercontent.com/dzx-dzx/Course-Selection-Assistant/master/Untitled-1.user.js
// @homepageURL https://github.com/dzx-dzx/Course-Selection-Assistant
// ==/UserScript==

(async function () {
    'use strict';
    // Your code here...
    const courseToIdRaw = (await (async () => {
        const courseListTimestampResponse = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://f002.backblazeb2.com/file/course/course.json",
                headers: { "Range": "bytes=0-0" },
                onload: function (response) { resolve(response) }
            })
        })
        const latestCourseListTimestamp = parseInt(courseListTimestampResponse.responseHeaders.split('\n').filter((i,/*教务系统似乎私自修改了Array的原型*/s) => s.includes("x-bz-info-src_last_modified_millis"))[0].split(":")[1])
        if (GM_getValue('course_list_timestamp') !== latestCourseListTimestamp) {
            const courseListResponse = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: "https://f002.backblazeb2.com/file/course/course.json",
                    onload: function (response) { resolve(response) }
                })
            })
            const courseToIdRaw = JSON.parse(courseListResponse.response)
            GM_setValue("course_list", courseToIdRaw)
            GM_setValue("course_list_timestamp", latestCourseListTimestamp)
            return courseToIdRaw
        }
        else return GM_getValue("course_list")
    })())

    const courseToIdMap = new Map(Object.entries(courseToIdRaw))

    function addButton(tr) {
        const classCodeRaw = tr.querySelector("td.jxbmc").textContent
        const classCode = classCodeRaw.split("-").at(-2)//什么你说兼容性?能吃吗?

        if (!courseToIdMap.has(classCode)) {
            console.warn(`课程${classCode}无法找到,请向开发者联系.`); return;
        }
        const classes = courseToIdMap.get(classCode)

        const teachers = Array.from(tr.querySelector("td.jsxmzc").querySelectorAll("a"), a => a.textContent)

        const id = teachers.reduce((pre, teacher) => {
            if (pre != null) return pre
            const res = classes.find((c) => c.teacher === teacher)
            if (res) return res.id
            else return null
        }, null)

        if (!id) {
            console.warn(`课程${classCode}下教师${teachers}均未找到,请向开发者联系.`); return;
        }

        const button = document.createElement("button")
        button.onclick = function () { window.open(`https://course.sjtu.plus/course/${id}`, "course"/*覆盖前一窗口,改成"_blank"以新建*/) }
        button.setAttribute("class", "btn btn-primary btn-sm")
        button.textContent = "跳转到选课社区"
        tr.querySelector("td.jxbmc").append(document.createElement("br"), button)
    }
    document.querySelectorAll("div.panel-body > table > tbody > tr ").forEach((tr => {
        if (tr.querySelector(".kkxymc").textContent !== "") addButton(tr)
    }))

    const observer = new MutationObserver((mutationList) => {
        mutationList.forEach((mutation) => { if (mutation.target.getAttribute("class") === "kkxymc") addButton(mutation.target.parentElement) })
    })
    observer.observe(document.querySelector("#displayBox"), { "childList": true, "subtree": true })

})();
