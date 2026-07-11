package com.imagemarkerexample;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;

public final class TestImageProvider extends ContentProvider {
  @Override
  public boolean onCreate() {
    return true;
  }

  @Override
  public String getType(Uri uri) {
    return "image/png";
  }

  @Override
  public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
    File image = new File(getContext().getCacheDir(), "content-loader-test.png");
    Bitmap bitmap = Bitmap.createBitmap(3, 2, Bitmap.Config.ARGB_8888);
    bitmap.eraseColor(Color.MAGENTA);
    try (FileOutputStream stream = new FileOutputStream(image)) {
      if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)) {
        throw new IOException("Unable to encode provider fixture");
      }
    } catch (IOException error) {
      FileNotFoundException wrapped = new FileNotFoundException("Unable to create provider fixture");
      wrapped.initCause(error);
      throw wrapped;
    } finally {
      bitmap.recycle();
    }
    return ParcelFileDescriptor.open(image, ParcelFileDescriptor.MODE_READ_ONLY);
  }

  @Override
  public Cursor query(
    Uri uri,
    String[] projection,
    String selection,
    String[] selectionArgs,
    String sortOrder
  ) {
    return null;
  }

  @Override
  public Uri insert(Uri uri, ContentValues values) {
    return null;
  }

  @Override
  public int delete(Uri uri, String selection, String[] selectionArgs) {
    return 0;
  }

  @Override
  public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
    return 0;
  }
}
