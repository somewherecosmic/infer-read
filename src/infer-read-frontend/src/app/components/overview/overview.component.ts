import { Component, OnInit } from '@angular/core';
import {
  Observable,
  Subscription,
  catchError,
  map,
  of,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';
import { HttpClient } from '@angular/common/http';
import config from 'devextreme/core/config';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { AuthorizationService } from '../../services/authorization-service/authorization.service';
import { UserConfigService } from 'src/app/services/user-config-service/user-config.service';
import { User, UserConfig } from '../../models/user.model';
import {
  DocumentGetResponse,
  DocumentDeletionResponse,
  DocumentPostResponse,
  UploadedDocument,
} from 'src/app/models/documents.model';

config({
  //BMcQ Comment: Configuration of floating action button
  floatingActionButtonConfig: {
    position: {
      my: 'right bottom',
      at: 'right bottom',
      of: '#documents-display-without-filter-options',
      offset: '-16 -16',
    },
  },
});

// TODO fetch user's books and display them here
// Need to add user ID or username to the book so we know who it belongs to

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent implements OnInit {
  // TODO implement the rest of the CRUD operations - Update and Delete, on the overview page
  // remove UPLOAD tab and have the user upload directly on the overview page?
  // BMcQ Comment: FontAwesome variables for icons.
  faTrash = faTrash;

  constructor(
    private authService: AuthorizationService,
    private userConfigService: UserConfigService,
    private httpClient: HttpClient
  ) {}

  user$: Observable<User>;
  userConfig$: Observable<UserConfig>;
  selectedLanguage: string;
  private documentsSubscription!: Subscription;
  documentsFromDB: UploadedDocument[];
  filteredDocuments: UploadedDocument[] = [];
  addDocumentVisible = false;
  isDeleteDocument = false;
  uploadDocData = new FormData();
  isSubmitAvailable = false;

  //BMcQ Comment: copying code from file-upload which will be moved here
  text = '';
  fileName = '';

  // Fetch the user docs array and display them on the template

  ngOnInit(): void {
    this.user$ = this.authService.user;
    this.userConfig$ = this.user$.pipe(
      switchMap((user: any) => this.userConfigService.getUserConfig(user))
    );
    this.userConfig$
      .pipe(map((userConfig: UserConfig) => userConfig))
      .subscribe((userConfigSuperObject: any) => {
        this.selectedLanguage =
          userConfigSuperObject.userConfig.selectedLanguage;
      });
    this.getDocuments();
  }

  getDocuments() {
    this.documentsSubscription = this.user$
      .pipe(
        switchMap((user) =>
          this.httpClient.get<DocumentGetResponse>(
            `http://localhost:3000/documents/getDocuments/${user.id}`
          )
        ),
        map((response) => response.documents),
        tap((documentsFromDB) => {
          this.documentsFromDB = documentsFromDB;
          this.filteredDocuments = this.filterDocuments(
            documentsFromDB,
            this.selectedLanguage
          );
        }),
        catchError((err) => {
          console.log(err);
          return throwError(() => new Error(err));
        })
      )
      .subscribe();
  }

  filterDocuments(documents: any, language: string) {
    if (documents && documents.length) {
      return documents.filter(
        (doc: UploadedDocument) => doc.language === language
      );
    }
  }

  // get ID of document, send to url for deletion
  deleteDocument(documentID: string) {
    this.documentsSubscription = this.user$
      .pipe(
        switchMap((user) =>
          this.httpClient.delete<DocumentDeletionResponse>(
            `http://localhost:3000/documents/deleteDocument/${user.id}/${documentID}`
          )
        ),
        tap(() => {
          this.getDocuments();
        }),
        catchError((err) => {
          console.log(err);
          return throwError(() => new Error(err));
        })
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    if (this.documentsSubscription) {
      this.documentsSubscription.unsubscribe();
    }
  }

  onAddDocument(): void {
    this.addDocumentVisible = true;
  }

  onFileSelected(event) {
    const file: File = event.target.files[0];

    if (file) {
      this.fileName = file.name;

      this.uploadDocData = new FormData();
      const userId: string = this.authService.getUserId();

      this.uploadDocData.append(
        'user',
        JSON.parse(localStorage.getItem('userObject')).id
      );
      this.uploadDocData.append('document', file, this.fileName);
      this.uploadDocData.append('language', this.selectedLanguage);
      this.isSubmitAvailable = true;
    }
  }

  onFileSubmit() {
    const upload$ = this.httpClient.post<DocumentPostResponse>(
      'http://127.0.0.1:8000/preprocess',
      this.uploadDocData
    );
    this.addDocumentVisible = false;

    upload$.subscribe((response) => {
      this.text = response.text;
    });
  }

  onDeleteDocNav(): void {
    this.isDeleteDocument = true;
  }

  onCancelDeleteDocNav(): void {
    this.isDeleteDocument = false;
  }
}
