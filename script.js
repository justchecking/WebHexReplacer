function readBlob(header, footer, ext) {
    document.getElementById("index").innerHTML = "Not Parsed";
    changedData = new Array();
    storedData = new Array();
    selected = -1;
    filetype = ext;



    removeAllChildNodes(document.getElementById("Filelist"));

    var files = document.getElementById('files').files;
    if (!files.length) {
        alert('Please select a file!');
        return;
    }

    var file = files[0];
    ogName = file.name;
    var blob = file.slice(0, file.size + 1);

    var fr = new FileReader();

    fr.addEventListener('load', function () {
        var data = sortData(this.result);
        InputData = data;
        document.getElementById("index").innerHTML = "Parsed, Processing";
        setTimeout(processData, 20, data, header, footer, ext, 0, 0, 0);

    });
    fr.readAsArrayBuffer(blob);

}

function customBlob() {
    var header = String(document.getElementById("Shex").value).toLowerCase();
    header.replace("0x", "");
    var footer = String(document.getElementById("Ehex").value).toLowerCase();
    footer.replace("0x", "");
    var ext = String(document.getElementById("Ext").value).toLowerCase();
    if (!ext.includes("."))
        ext = "." + ext;
    readBlob(header, footer, ext);
}

function sortData(datain) {
    var u = new Uint8Array(datain),
        i = u.length,
        newdata = '';
    while (i--) {// map to hex
        newdata = (u[i] < 16 ? '0' : '') + u[i].toString(16) + newdata;
        u[i] = null;
    }
    u = null; // free memory
    return newdata;
}

function processData(data, header, footer, ext, Ostart, Oend, Oindex) {
    var start = Ostart;
    var end = Oend;
    var index = Oindex;
    var chunk;
    var prevTime = Date.now();
    while (start !== -1) {
        while (true) {
            start = data.indexOf(header, start);
            if (start % 2 < 1 || start === -1)
                break;
            else if (start < 1 + data.length) start++;
        }

        if (start === -1) {
            document.getElementById("index").innerHTML = "Read bytes: " + 100 + "%";
            break;
        }
        var quickIndex = header.length;
        var emergency = header.length;

        if (ext === '.ogg') {
            var distance = start;
            while (true) {
                if (data.charAt(distance + 10) + data.charAt(distance + 11) == "04") {
                    end = distance;
                    break;
                }
                distance += 52;
                var segment = parseInt("0x" + data.charAt(distance) + data.charAt(distance + 1));
                var size = 0;
                for (let i = 0; i < segment; i++) {
                    size += parseInt("0x" + data.charAt(distance + 2 + (i * 2)) + data.charAt(distance + 3 + (i * 2)));
                }
                var nextheader = distance + 2 + (segment * 2) + (size * 2);
                if (nextheader > data.length) {
                    end = -1;
                    break;
                }
                //   console.log(next + "   Our next point");
                //   console.log(nextheader + "   Where we are jumping to");
                if (data.charAt(nextheader) + data.charAt(nextheader + 1) + data.charAt(nextheader + 2) + data.charAt(nextheader + 3) +
                    data.charAt(nextheader + 4) + data.charAt(nextheader + 5) + data.charAt(nextheader + 6) + data.charAt(nextheader + 7) === "4f676753") {
                    distance = nextheader;
                } else {
                    console.log(nextheader + "   Our next point");
                    console.log(start + "   Total Distance");
                    end = -1;
                    break;
                }
            }
        } else if (ext === '.jpg') {
            var distance;
            var bitsafter;
            while (true) {
                end = data.indexOf('ff', start + quickIndex);
                if (end % 2 < 1) {
                    if (start > end || end === -1) {
                        console.log("OH-NO WE BROKE OUT OF THE RANGE!");
                        // if we are here we somehow jumped out of range of the current image! ... Probably 
                        //	So we find the FIRST valid jpeg exit marker and assume it to be good (DANGEROUS!)
                        end = data.indexOf('ffd9', start + emergency)
                        if (end % 2 < 1 || end === -1)
                            break;
                        else emergency++;
                    }
                    bitsafter = data.charAt(end + 2) + data.charAt(end + 3);
                    switch (bitsafter) {
                        case '00':
                        case '01':
                        case 'd0':
                        case 'd1':
                        case 'd2':
                        case 'd3':
                        case 'd4':
                        case 'd5':
                        case 'd6':
                        case 'd7':
                        case 'd8':
                        case 'ff':
                            quickIndex += 2;
                            continue;
                    }
                    if (bitsafter != 'd9') {
                        distance = ((256 * parseInt(data.charAt(end + 4) + data.charAt(end + 5), 16)) + (parseInt(data.charAt(end + 6) + data.charAt(end + 7), 16))) * 2;
                        quickIndex += distance;
                        continue;
                    } else
                        break;
                } else if (start + quickIndex < data.length) quickIndex++;
            }
        } else
            while (true) {
                end = data.indexOf(footer, start + quickIndex);
                if (end % 2 < 1 || end === -1)
                    break;
                else if (start + quickIndex < 1 + data.length) quickIndex++;
            }

        //if we can't find a start OR end, break
        if (start === -1 || end === -1 || end < start || end === start) {
            document.getElementById("index").innerHTML = "Read bytes: " + 100 + "%";
            break;
        }
        end = end + footer.length;
        //grab just that image
        chunk = data.slice(start, end);
        console.log('img %d start %d end %d length %d', index, start, end, end - start);
        storedData[index] = chunk;
        Convert(chunk, index, ext);

        var ul = document.getElementById("Filelist");
        var li = document.createElement("li");
        li.appendChild(document.createTextNode(index + ext));
        li.setAttribute('onclick', "imgselect(" + index + ")");
        ul.appendChild(li);

        index++;
        start = end;

        if (Date.now() > prevTime + 200) {
            prevTime = Date.now();
            document.getElementById("index").innerHTML = "Read bytes: " + ((end / data.length) * 100).toFixed(2) + "%";
            setTimeout(processData, 10, data, header, footer, ext, start, end, index);
            break;
        }
        if (index > 9999) {
            break;
        }
    }
}

{
    var ogName;
    var storedData = new Array();
    var changedData = new Array();
    var selected = -1;
    var filetype;
    var InputData;
    const actualBtn = document.getElementById('files');

    const fileChosen = document.getElementById('file-chosen');

    actualBtn.addEventListener('change', function () {
        fileChosen.textContent = this.files[0].name
    })
}

function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

function imgselect(num) {
    selected = num;
    var a = window.document.createElement('a');
    if (filetype == ".ogg")
        a.href = window.URL.createObjectURL(new Blob([changedData[num]], {
            type: 'audio/ogg'
        }));
    else
        a.href = window.URL.createObjectURL(new Blob([changedData[num]], {
            type: 'application/octet-stream'
        }));
    a.download = num + filetype;
    // Append anchor to body.
    document.body.appendChild(a);
    if (filetype == ".ogg") {
        document.getElementById('audio').src = a.href
        var audio = document.getElementById('Sourceaudio');
        audio.load();
    } else document.getElementById('image').src = a.href
}

function downloadAll() {
    if (document.getElementById("index").innerHTML === 'Not Parsed') {
        alert("Parse data first! \n Click Png , Jpg ...Etc");
        return;
    }
    var zip = new JSZip();
    DownloadallFiles(zip, changedData.length, 0);
}

function DownloadallFiles(zip, index, start) {
    for (let i = start; i < index; i++) {
        zip.file(i + filetype, changedData[i]);
        document.getElementById("index").innerHTML = "Files Added: " + index;
    }
    document.getElementById("index").innerHTML = "Downloading... ";
    zip.generateAsync({type: "blob"}).then(function (content) {
        document.getElementById("index").innerHTML = "Downloaded!";
        saveAs(content, "files.zip");
    });


}

function download() {
    InputData = InputData.toUpperCase();
    InputData = InputData.replace(/[^A-Fa-f0-9]/g, "");

    let len = InputData.length / 2;
    var byteArray = new Uint8Array(InputData.length / 2);

    for (let i = 0; i < len; i++) {
        byteArray[i] = parseInt(InputData.substr(0, 2), 16);
        InputData = InputData.substring(2);
    }
    document.getElementById("index").innerHTML = "Converted file downloaded!";
    var a = window.document.createElement('a');

    a.href = window.URL.createObjectURL(new Blob([byteArray], {
        type: 'application/octet-stream'
    }));
    a.download = ogName;
    // Append anchor to body.
    document.body.appendChild(a);
    a.click();

}

function uploadAll() {
    var files = document.getElementById('upload').files;
    if (!files.length) {
        alert('Please select a file!');
        return;
    }
    var files = document.getElementById('upload').files;
    for (var i = 0; i < files.length; i++) {
        easyfile(files[i]);
    }
}

function easyfile(f) {
    var counter = 0;
    JSZip.loadAsync(f).then(function (zip) {
        Object.keys(zip.files).forEach(function (filename) {
            zip.files[filename].async('Uint8Array').then(function (fileData) {
                var newData = sortData(fileData);
                let indg = filename.split(".");
                let num = getFileName(indg[0]);
                if ("." + indg[1] === filetype) {
                    counter++;
                    console.log("Replacing file #  " + filename, "  # " + counter);
                    document.getElementById("index").innerHTML = "Currently on  " + counter;
                    InputData = InputData.replace(storedData[parseInt(num)], newData);
                }
            });
        });
    });
}

// function to remove everthing before last /
function getFileName(arr) {
    return arr.replace(/^.*\/(.*)$/, "$1");
}


function clean_hex(input) {
    input = input.toUpperCase();
    var orig_input = input;
    input = input.replace(/[^A-Fa-f0-9]/g, "");
    if (orig_input != input)
        alert("Warning! Non-hex characters?");
    if (input.length % 2)
        alert("Error: cleaned hex string length is odd.");
    return input;
}

function Convert(hex, index, ext) {
    var cleaned_hex = clean_hex(hex);
    var binary = new Array();
    for (var i = 0; i < cleaned_hex.length / 2; i++) {
        binary[i] = parseInt(cleaned_hex.substr(i * 2, 2), 16);
    }
    var byteArray = new Uint8Array(binary);
    changedData[index] = byteArray;
}