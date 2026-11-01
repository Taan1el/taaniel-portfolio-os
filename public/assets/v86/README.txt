linux.iso is the small Linux image from the v86 project (https://github.com/copy/v86),
served at https://i.copy.sh/linux4.iso. The kernel and userland are GPL software;
see the v86 repository for how such images are built.

The image mounts the 9p device "host9p" at /mnt from /etc/profile, once for each of its two
login shells. The second mount always fails harmlessly, so the app clears that from the screen.
